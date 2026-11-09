package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 用户与用户组的归属解析：主组（t_user.dept_id）+ 附加组（t_user_dept）+ 各自祖先链，
 * 以及「按组筛选 / 按当前用户数据范围收敛」的查询条件拼装。
 *
 * <p>
 * 从 {@code UserServiceImpl} 切出的部门域组件。注意类名不能叫 UserDeptScopeService：
 * {@code cn.surveyking.server.service.UserDeptScopeService} 已经是 Spring bean，
 * 同名类会造成默认 bean 名冲突（ConflictingBeanDefinitionException）。
 *
 * <p>
 * 依赖只有 t_user / t_user_dept / t_dept 三张表，不反向依赖认证与权限断言组件，
 * 因此 {@code UserAuthService → UserDeptMembershipService}、{@code UserPermissionGuard → 两者}
 * 的依赖链没有循环。
 */
@Component
@RequiredArgsConstructor
public class UserDeptMembershipService {

	/** 组织树的根 parent_id（t_dept 里顶层节点的 parent_id 是 "0"） */
	private static final String ROOT_DEPT_PARENT_ID = "0";

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	private final DeptMapper deptMapper;

	/**
	 * 校验用户所属组链的有效期。
	 * 用户可能是「主组 + 若干附加组」（一人多组），每个组各自沿祖先链校验；
	 * 任意一个组（或它的祖先组）不在有效窗口内就拒绝登录，并说明是哪个组。
	 * 组上的 valid_from / valid_to 为空表示不限制。
	 */
	public void assertDeptValid(String userId) {
		if (!StringUtils.hasText(userId)) {
			return;
		}
		User user = userMapper.selectById(userId);
		if (user == null) {
			return;
		}
		List<String> rootDeptIds = resolveUserDeptIds(user);
		if (CollectionUtils.isEmpty(rootDeptIds)) {
			return;
		}
		Map<String, Dept> deptMap = loadDeptMap();
		java.util.Date now = new java.util.Date();
		for (String deptId : resolveDeptChainIds(rootDeptIds, deptMap)) {
			Dept dept = deptMap.get(deptId);
			if (dept == null) {
				continue;
			}
			if (dept.getValidFrom() != null && now.before(dept.getValidFrom())) {
				throw new AccessDeniedException("所在用户组「" + dept.getName() + "」尚未到生效时间（"
						+ new java.text.SimpleDateFormat("yyyy-MM-dd").format(dept.getValidFrom()) + " 起），请联系管理员");
			}
			if (dept.getValidTo() != null && now.after(dept.getValidTo())) {
				throw new AccessDeniedException("所在用户组「" + dept.getName() + "」有效期已过（"
						+ new java.text.SimpleDateFormat("yyyy-MM-dd").format(dept.getValidTo()) + " 截止），请联系管理员延期");
			}
		}
	}

	/**
	 * 用户所属的全部组：主组（t_user.dept_id）在前，附加组（t_user_dept）在后，去重。
	 */
	private List<String> resolveUserDeptIds(User user) {
		if (user == null) {
			return Collections.emptyList();
		}
		return mergeDeptIds(user.getDeptId(), listExtraDeptIds(user.getId()));
	}

	public List<String> mergeDeptIds(String mainDeptId, List<String> extraDeptIds) {
		java.util.LinkedHashSet<String> merged = new java.util.LinkedHashSet<>();
		if (StringUtils.hasText(mainDeptId)) {
			merged.add(mainDeptId);
		}
		if (!CollectionUtils.isEmpty(extraDeptIds)) {
			extraDeptIds.stream().filter(StringUtils::hasText).map(String::trim).forEach(merged::add);
		}
		return new ArrayList<>(merged);
	}

	/** 附加组 id（不含主组） */
	public List<String> listExtraDeptIds(String userId) {
		if (!StringUtils.hasText(userId)) {
			return Collections.emptyList();
		}
		return userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getUserId, userId)).stream()
				.map(UserDept::getDeptId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
	}

	/**
	 * 重写用户的附加组：先物理删除再插入（唯一键 (user_id, dept_id) 不能和逻辑删除共存）。
	 * 主组已经存在 t_user.dept_id，这里顺带把它从附加组里剔掉，避免同一个组出现两次。
	 */
	public void saveUserDepts(String userId, String mainDeptId, List<String> extraDeptIds) {
		if (!StringUtils.hasText(userId)) {
			return;
		}
		userDeptMapper.deleteByUserId(userId);
		if (CollectionUtils.isEmpty(extraDeptIds)) {
			return;
		}
		extraDeptIds.stream().filter(StringUtils::hasText).map(String::trim)
				.filter(deptId -> !deptId.equals(mainDeptId)).distinct().forEach(deptId -> {
					UserDept userDept = new UserDept();
					userDept.setUserId(userId);
					userDept.setDeptId(deptId);
					userDeptMapper.insert(userDept);
				});
	}

	/** 一次取出全部用户组（组表很小），供祖先链解析与组名回显复用 */
	public Map<String, Dept> loadDeptMap() {
		return deptMapper.selectList(null).stream().filter(Objects::nonNull)
				.collect(Collectors.toMap(Dept::getId, dept -> dept, (a, b) -> a));
	}

	/** 组 → 名称；查不到回落成 id，避免界面上出现空白标签 */
	public String deptNameOf(Map<String, Dept> deptMap, String deptId) {
		Dept dept = deptMap.get(deptId);
		return dept != null && isNotBlank(dept.getName()) ? dept.getName() : deptId;
	}

	/**
	 * 用户所属组 + 各自祖先链展开后的组 id（去重，主组及其祖先排在最前）。
	 */
	public List<String> resolveDeptChainIds(List<String> rootDeptIds, Map<String, Dept> deptMap) {
		LinkedHashSet<String> chain = new LinkedHashSet<>();
		if (CollectionUtils.isEmpty(rootDeptIds)) {
			return new ArrayList<>(chain);
		}
		Set<String> visited = new HashSet<>();
		for (String rootDeptId : rootDeptIds) {
			String deptId = rootDeptId;
			while (StringUtils.hasText(deptId) && !ROOT_DEPT_PARENT_ID.equals(deptId) && visited.add(deptId)) {
				chain.add(deptId);
				Dept dept = deptMap.get(deptId);
				if (dept == null) {
					break;
				}
				deptId = dept.getParentId();
			}
		}
		return new ArrayList<>(chain);
	}

	public List<String> getChildOrgIds(String parentOrgId) {
		List<String> result = new ArrayList<>();
		if (parentOrgId == null) {
			return result;
		}
		result.add(parentOrgId);
		deptMapper.selectList(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, parentOrgId)).forEach(dept -> {
			result.addAll(getChildOrgIds(dept.getId()));
		});
		return result;
	}

	/**
	 * 「用户属于这些组」的查询条件：主组（t_user.dept_id）命中，或者附加组（t_user_dept）命中。
	 *
	 * <p>
	 * 附加组先转成 user_id 集合再 OR，不把组 id 拼进 SQL 字符串——组 id 来自请求参数，
	 * 直接拼接会有注入风险；这里的组人数是几十到几百量级，IN 列表可以接受。
	 * 组 id 集合为空（没按组筛选）时什么都不加，保持「查全部」的原语义。
	 */
	public void applyUserDeptScope(LambdaQueryWrapper<User> wrapper, List<String> deptIds) {
		if (CollectionUtils.isEmpty(deptIds)) {
			return;
		}
		List<String> extraDeptUserIds = userDeptMapper
				.selectList(Wrappers.<UserDept>lambdaQuery().in(UserDept::getDeptId, deptIds)).stream()
				.map(UserDept::getUserId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		wrapper.and(w -> {
			w.in(User::getDeptId, deptIds);
			if (!extraDeptUserIds.isEmpty()) {
				w.or().in(User::getId, extraDeptUserIds);
			}
		});
	}

	/**
	 * 用户列表的数据范围（非管理员），与题库/考试的组范围同一口径：
	 * <ul>
	 * <li>自己所在用户组（主组 + 附加组）及其祖先链下的用户 —— 组链解析复用
	 * {@link #resolveDeptChainIds}，与 {@code UserDeptScopeService.DEPT_SCOPE_SQL} 的祖先链语义一致；</li>
	 * <li>或 {@code create_by = 自己}：自己建的学员就算后来被调到别的组，也仍然留在自己的列表里。</li>
	 * </ul>
	 *
	 * <p>
	 * 管理员保持全量。这里只「收窄范围」，不改变按组筛选的语义：它与 {@link #applyUserDeptScope}
	 * 在查询条件里是同层 AND，所以 (主组命中 OR 附加组命中) 依然生效。
	 *
	 * <p>
	 * 子查询都走 Mapper / IN 列表，不把用户输入拼进 SQL；附加组同样是先转成 user_id 集合再 OR。
	 */
	public void applyCurrentUserDataScope(LambdaQueryWrapper<User> wrapper) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		String currentUserId = SecurityContextUtils.getUserId();
		if (!StringUtils.hasText(currentUserId) || AppConsts.ANONYMOUS_USER_ID.equals(currentUserId)) {
			// 用户列表接口本身要求登录；万一走到这里也绝不放成全量
			wrapper.eq(User::getId, AppConsts.ANONYMOUS_USER_ID);
			return;
		}
		// 主组 + 附加组 → 各自祖先链（组表整表取一次，与 loadUserById 同一套解析）
		Map<String, Dept> deptMap = loadDeptMap();
		List<String> ancestorChainIds = resolveDeptChainIds(resolveUserDeptIds(userMapper.selectById(currentUserId)), deptMap);
		// 再向下扩展到子树：年级主任挂在「年级组」，也要能看到下属班级的学生。
		// 只按祖先链会漏掉子组，这是 2026-11-07 评审时确认要补的语义。
		// 用 final 变量给下面的 lambda 捕获（Java 8 要求 effectively final）
		final List<String> deptChainIds = expandWithDescendants(ancestorChainIds, deptMap);
		List<String> extraDeptUserIds = deptChainIds.isEmpty() ? Collections.emptyList()
				: userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery().in(UserDept::getDeptId, deptChainIds))
						.stream().map(UserDept::getUserId).filter(StringUtils::hasText).distinct()
						.collect(Collectors.toList());
		wrapper.and(scope -> {
			if (deptChainIds.isEmpty()) {
				// 没有任何组的人只剩「自己建的账号」这一条范围
				scope.eq(User::getCreateBy, currentUserId);
				return;
			}
			scope.in(User::getDeptId, deptChainIds);
			if (!extraDeptUserIds.isEmpty()) {
				scope.or().in(User::getId, extraDeptUserIds);
			}
			scope.or().eq(User::getCreateBy, currentUserId);
		});
	}

	/**
	 * 把「自己的组 + 祖先链」扩展成「再加上所有子孙组」。
	 *
	 * <p>没有子孙会漏掉「年级主任挂着年级组、看不到下属班级学生」这种结构；
	 * 组表很小（全量取一次），这里用迭代向上找父的方式展开，避免拼递归 SQL。
	 */
	private List<String> expandWithDescendants(List<String> chainIds, Map<String, Dept> deptMap) {
		if (chainIds == null || chainIds.isEmpty() || deptMap == null || deptMap.isEmpty()) {
			return chainIds == null ? Collections.emptyList() : chainIds;
		}
		Set<String> scope = new LinkedHashSet<>(chainIds);
		boolean changed = true;
		while (changed) {
			changed = false;
			for (Dept dept : deptMap.values()) {
				if (dept.getId() == null || scope.contains(dept.getId()) || dept.getParentId() == null) {
					continue;
				}
				if (scope.contains(dept.getParentId())) {
					scope.add(dept.getId());
					changed = true;
				}
			}
		}
		return new ArrayList<>(scope);
	}

	public void getTreeDeptId(String deptId, List<String> list) {
		List<Dept> deptList = deptMapper.selectList(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, deptId));
		Optional.ofNullable(deptList).map(List::stream).orElseGet(Stream::empty).forEach(info -> {
			list.add(info.getId());
			this.getTreeDeptId(info.getId(), list);
		});
	}

}
