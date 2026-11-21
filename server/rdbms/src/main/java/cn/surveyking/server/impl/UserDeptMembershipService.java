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















@Component
@RequiredArgsConstructor
public class UserDeptMembershipService {


	private static final String ROOT_DEPT_PARENT_ID = "0";

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	private final DeptMapper deptMapper;

	/** 校验用户所属组链的有效期 */
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

	/** 用户所属的全部组：主组（t_user.dept_id）在前，附加组（t_user_dept）在后，去重 */
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

	/** 重写用户的附加组：先物理删除再插入（唯一键 (user_id, dept_id) 不能和逻辑删除共存） */
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

	/** 用户所属组 + 各自祖先链展开后的组 id（去重，主组及其祖先排在最前） */
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

	/** 「用户属于这些组」的查询条件：主组（t_user.dept_id）命中，或者附加组（t_user_dept）命中 */
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

	/** 用户列表的数据范围（非管理员），与题库/考试的组范围同一口径：  自己所在用户组（主组 + 附加组）及其祖先链下的用户 —— 组链解析复用 #resolveDeptChainIds，与 UserDeptScopeService.DEPT_SCOPE_SQL 的祖先链语义一致； 或 create_by = 自己：自己建的学员就算后来被调到别的组，也仍然留在自己的列表里 */
	public void applyCurrentUserDataScope(LambdaQueryWrapper<User> wrapper) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		String currentUserId = SecurityContextUtils.getUserId();
		if (!StringUtils.hasText(currentUserId) || AppConsts.ANONYMOUS_USER_ID.equals(currentUserId)) {

			wrapper.eq(User::getId, AppConsts.ANONYMOUS_USER_ID);
			return;
		}

		Map<String, Dept> deptMap = loadDeptMap();
		List<String> ancestorChainIds = resolveDeptChainIds(resolveUserDeptIds(userMapper.selectById(currentUserId)), deptMap);



		final List<String> deptChainIds = expandWithDescendants(ancestorChainIds, deptMap);
		List<String> extraDeptUserIds = deptChainIds.isEmpty() ? Collections.emptyList()
				: userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery().in(UserDept::getDeptId, deptChainIds))
						.stream().map(UserDept::getUserId).filter(StringUtils::hasText).distinct()
						.collect(Collectors.toList());
		wrapper.and(scope -> {
			if (deptChainIds.isEmpty()) {

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

	/** 把「自己的组 + 祖先链」扩展成「再加上所有子孙组」 */
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
