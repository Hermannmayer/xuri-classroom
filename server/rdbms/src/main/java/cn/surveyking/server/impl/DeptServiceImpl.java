package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.DeptSortRequest;
import cn.surveyking.server.domain.dto.DeptView;
import cn.surveyking.server.domain.dto.SelectDeptRequest;
import cn.surveyking.server.domain.mapper.DeptDtoMapper;
import cn.surveyking.server.domain.model.ClassPartner;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.DeptRole;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.domain.model.RepoPartner;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.domain.model.UserPosition;
import cn.surveyking.server.mapper.ClassPartnerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.DeptRoleMapper;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.mapper.RepoPartnerMapper;
import cn.surveyking.server.mapper.RoleMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.mapper.UserPositionMapper;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.DeptService;
import cn.surveyking.server.service.UserService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.CollectionUtils;

import javax.validation.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * @author javahuang
 * @date 2021/11/2
 */
@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class DeptServiceImpl extends BaseService<DeptMapper, Dept> implements DeptService {

	/** 组织树的根 parent_id（t_dept 里顶层节点的 parent_id 是 "0"） */
	private static final String ROOT_DEPT_PARENT_ID = "0";

	private final DeptDtoMapper deptDtoMapper;

	private final UserService userService;

	private final UserPositionMapper userPositionMapper;

	private final DeptRoleMapper deptRoleMapper;

	private final RoleMapper roleMapper;

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	private final RepoPartnerMapper repoPartnerMapper;

	private final ProjectPartnerMapper projectPartnerMapper;

	private final ClassPartnerMapper classPartnerMapper;

	private final CacheManager cacheManager;

	@Override
	public List<DeptView> listDept(SelectDeptRequest request) {
		if (request == null) {
			request = new SelectDeptRequest();
		}
		List<DeptView> result = deptDtoMapper.toView(list(Wrappers.<Dept>lambdaQuery()
				.in(!CollectionUtils.isEmpty(request.getSelected()), Dept::getId, request.getSelected())
				.orderByAsc(Dept::getSortCode)));
		result.forEach(orgView -> {
			String managerId = orgView.getManagerId();
			if (isNotBlank(managerId)) {
				orgView.setManagerName(userService.loadUserById(managerId).getName());
			}
			// 回填该组绑定的角色，前端用户组页要回显「这个组有哪些角色」
			List<String> roleIds = deptRoleMapper.selectList(Wrappers.<DeptRole>lambdaQuery()
					.eq(DeptRole::getDeptId, orgView.getId())).stream().map(DeptRole::getRoleId)
							.collect(Collectors.toList());
			orgView.setRoleIds(roleIds);
			orgView.setRoleNames(roleIds.stream().map(roleId -> {
				Role role = roleMapper.selectById(roleId);
				return role == null ? roleId : role.getName();
			}).collect(Collectors.toList()));
		});
		return result;
	}

	@Override
	public DeptView getDept(String id) {
		return deptDtoMapper.toView(getById(id));
	}

	/**
	 * 写操作必须同时清 deptCache 与 userCache。
	 *
	 * <p>
	 * deptCache 是 {@code GET /api/system/dept/list}（request 为 null 时取全量列表）的缓存，
	 * 命中后方法体根本不会执行。此前实现类方法上只写了 {@code @CacheEvict(userCache)}，
	 * 而 Spring 的缓存拦截器先按「最具体的实现方法」找注解、找到就直接用，<b>不会</b>再回退到
	 * 接口 {@code DeptService} 上的 {@code @CacheEvict(deptCache)}——于是 deptCache 只写不清：
	 * 给用户组绑好角色后列表最长 1 天（deptCache 的 TTL）都还是旧值，前端编辑弹窗又拿这份旧数据
	 * 回填 roleIds，一保存就把空数组写回去，saveDeptRoles 的「先删后插」于是把真实绑定清掉。
	 * 所以四个写方法统一用 {@code @Caching} 同时清两个缓存，注解只写在实现方法上。
	 */
	@Override
	@Caching(evict = { @CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true),
			@CacheEvict(cacheNames = CacheConsts.userCacheName, allEntries = true) })
	public void addDept(DeptRequest request) {
		Dept dept = deptDtoMapper.fromRequest(request);
		if (StringUtils.isEmpty(request.getParentId())) {
			dept.setParentId("0");
		}
		// short_name 在库里是 NOT NULL 且无默认值，不传会直接 SQL 500
		if (StringUtils.isEmpty(dept.getShortName())) {
			dept.setShortName(dept.getName());
		}
		dept.setSortCode((int) count(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, request.getParentId())));
		save(dept);
		saveDeptRoles(dept.getId(), request.getRoleIds());
	}

	@Override
	@Caching(evict = { @CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true),
			@CacheEvict(cacheNames = CacheConsts.userCacheName, allEntries = true) })
	public void updateDept(DeptRequest request) {
		assertParentPlacementAllowed(request.getId(), request.getParentId());
		updateById(deptDtoMapper.fromRequest(request));
		// roleIds 为 null 表示本次不改角色（只改名字/上级）；传空数组表示清空
		if (request.getRoleIds() != null) {
			saveDeptRoles(request.getId(), request.getRoleIds());
		}
	}

	/**
	 * 改「上级组」会把整棵子树挪到新的祖先链下，组内成员因此继承新祖先绑定的角色——
	 * 这是一条绕过 {@link #assertGrantableDeptRoles(List)} 的提权路径（自己绑不了 teacher，
	 * 但把自己所在的组挂到「绑了 teacher 的组」下面就行）。所以这里做两件事：
	 * <ol>
	 * <li>禁止成环：上级不能是自己，也不能是自己的子孙；</li>
	 * <li>非管理员：新祖先链上绑定的角色必须都是他能授予的。</li>
	 * </ol>
	 */
	private void assertParentPlacementAllowed(String deptId, String parentId) {
		if (!isNotBlank(deptId) || !isNotBlank(parentId) || ROOT_DEPT_PARENT_ID.equals(parentId)) {
			// 没指定上级，或者移到根：没有新的祖先链，无需校验
			return;
		}
		Map<String, Dept> deptMap = loadDeptMap();
		if (parentId.equals(deptId)) {
			throw new IllegalArgumentException("上级用户组不能是自己");
		}
		// 从新上级往上找：撞到自己说明要挂到自己的子孙下面（成环）
		Set<String> visited = new HashSet<>();
		String cursor = parentId;
		while (isNotBlank(cursor) && !ROOT_DEPT_PARENT_ID.equals(cursor) && visited.add(cursor)) {
			if (cursor.equals(deptId)) {
				throw new IllegalArgumentException("不能把用户组移动到自己的子组下面");
			}
			Dept dept = deptMap.get(cursor);
			cursor = dept == null ? null : dept.getParentId();
		}
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		Set<String> roleIds = boundRoleIds(ancestorChain(parentId, deptMap));
		if (roleIds.isEmpty()) {
			return;
		}
		Set<String> callerAuthorities = SecurityContextUtils.getUser().getAuthorities().stream()
				.map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
		for (Role role : roleMapper.selectBatchIds(roleIds)) {
			// 孤儿绑定（角色已被删）不授予任何权限，忽略
			if (role == null || !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID)) {
				continue;
			}
			Set<String> roleAuthorities = toRoleAuthorities(role);
			if (roleAuthorities.contains(AppConsts.ROLE_ADMIN) || !callerAuthorities.containsAll(roleAuthorities)) {
				throw new AccessDeniedException(
						"不能把用户组挂到这个上级组下：上级链上绑定的角色「" + role.getName() + "」权限高于当前用户");
			}
		}
	}

	/** 一次取出全部用户组（组表很小），供祖先链解析复用 */
	private Map<String, Dept> loadDeptMap() {
		return list(null).stream().filter(Objects::nonNull)
				.collect(Collectors.toMap(Dept::getId, dept -> dept, (a, b) -> a));
	}

	/** 从 startId 开始向上收集组 id（含 startId 本身），到根为止 */
	private List<String> ancestorChain(String startId, Map<String, Dept> deptMap) {
		List<String> chain = new ArrayList<>();
		Set<String> visited = new HashSet<>();
		String cursor = startId;
		while (isNotBlank(cursor) && !ROOT_DEPT_PARENT_ID.equals(cursor) && visited.add(cursor)) {
			chain.add(cursor);
			Dept dept = deptMap.get(cursor);
			cursor = dept == null ? null : dept.getParentId();
		}
		return chain;
	}

	private Set<String> boundRoleIds(List<String> deptIds) {
		if (CollectionUtils.isEmpty(deptIds)) {
			return new HashSet<>();
		}
		return deptRoleMapper.selectList(Wrappers.<DeptRole>lambdaQuery().in(DeptRole::getDeptId, deptIds)).stream()
				.map(DeptRole::getRoleId).filter(StringUtils::isNotBlank).collect(Collectors.toSet());
	}

	/** 角色带来的权限串集合（ROLE_code + authority 拆分），与 UserServiceImpl#toAuthorityNames 口径一致 */
	private Set<String> toRoleAuthorities(Role role) {
		Set<String> authorities = new HashSet<>();
		if (role != null && isNotBlank(role.getCode())) {
			authorities.add("ROLE_" + role.getCode());
		}
		if (role != null && isNotBlank(role.getAuthority())) {
			Arrays.stream(role.getAuthority().split(",")).map(String::trim).filter(StringUtils::isNotBlank)
					.forEach(authorities::add);
		}
		return authorities;
	}

	/**
	 * 组→角色绑定：先删后插，保证与界面勾选一致；用物理删除，避免软删行撞 (dept_id, role_id) 唯一键。
	 *
	 * <p>
	 * 组绑定的角色现在直接决定组内成员的最终权限（见 UserServiceImpl#loadUserById），所以写完必须
	 * 让 userCache 失效——否则改完角色，组内用户最长 1 小时（userCache TTL）都拿旧权限。
	 * 事务内统一注册 afterCommit 清理，避免并发的 loadUserById 把旧结果重新塞回缓存。
	 */
	private void saveDeptRoles(String deptId, List<String> roleIds) {
		if (!isNotBlank(deptId)) {
			return;
		}
		assertGrantableDeptRoles(roleIds);
		deptRoleMapper.deleteByDeptId(deptId);
		if (!CollectionUtils.isEmpty(roleIds)) {
			roleIds.stream().filter(StringUtils::isNotBlank).distinct().forEach(roleId -> {
				DeptRole binding = new DeptRole();
				binding.setDeptId(deptId);
				binding.setRoleId(roleId);
				deptRoleMapper.insert(binding);
			});
		}
		evictAllUserCache();
	}

	/**
	 * 组绑角色等于「一次性给组内所有人加角色」，不能让人借编辑用户组提权：
	 * 调用者必须拥有待绑定角色的全部权限串，且不能把超级管理员角色绑到组上。
	 * 管理员（ROLE_admin）不受此限，规则与「给用户直挂角色」保持一致。
	 */
	private void assertGrantableDeptRoles(List<String> roleIds) {
		if (CollectionUtils.isEmpty(roleIds)) {
			return;
		}
		List<String> normalized = roleIds.stream().filter(StringUtils::isNotBlank).map(String::trim).distinct()
				.collect(Collectors.toList());
		if (normalized.isEmpty()) {
			return;
		}
		List<Role> roles = roleMapper.selectBatchIds(normalized);
		if (roles.size() != normalized.size()
				|| roles.stream().anyMatch(role -> !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID))) {
			throw new AccessDeniedException("不能绑定不存在或已停用的角色");
		}
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		Set<String> callerAuthorities = SecurityContextUtils.getUser().getAuthorities().stream()
				.map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
		for (Role role : roles) {
			Set<String> roleAuthorities = toRoleAuthorities(role);
			if (roleAuthorities.contains(AppConsts.ROLE_ADMIN) || !callerAuthorities.containsAll(roleAuthorities)) {
				throw new AccessDeniedException("不能绑定权限高于当前用户的角色");
			}
		}
	}

	/** 组角色变更后清空用户权限缓存（userCache 是内存 ConcurrentMap，clear 足够便宜） */
	private void evictAllUserCache() {
		Cache userCache = cacheManager.getCache(CacheConsts.userCacheName);
		if (userCache == null) {
			return;
		}
		Runnable clear = userCache::clear;
		if (TransactionSynchronizationManager.isActualTransactionActive()
				&& TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					clear.run();
				}
			});
		}
		else {
			clear.run();
		}
	}

	@Override
	@Caching(evict = { @CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true),
			@CacheEvict(cacheNames = CacheConsts.userCacheName, allEntries = true) })
	public void deleteDept(String id) {
		List<Dept> children = list(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, id));
		if (!children.isEmpty()) {
			String names = children.stream().map(Dept::getName).filter(Objects::nonNull).limit(5)
					.collect(Collectors.joining("、"));
			throw new ValidationException("这个分组下面还有子分组" + (names.isEmpty() ? "" : "（" + names + "）")
					+ "，请先删除或移动子分组");
		}
		// 组里还有人时不允许直接删：否则学员会变成「无班级」，班级管理里反而找不到他们。
		// 先把成员移到别的组或删除账号，再删组。
		long primaryMembers = userMapper.selectCount(Wrappers.<User>lambdaQuery().eq(User::getDeptId, id));
		long extraMembers = userDeptMapper.selectCount(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getDeptId, id));
		if (primaryMembers + extraMembers > 0) {
			throw new ValidationException("这个分组还有 " + (primaryMembers + extraMembers) + " 个成员，请先把成员移到其他分组或删除账号");
		}
		userDeptMapper.delete(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getDeptId, id));
		repoPartnerMapper.delete(Wrappers.<RepoPartner>lambdaQuery().eq(RepoPartner::getDeptId, id));
		projectPartnerMapper.delete(Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getGroupId, id));
		classPartnerMapper.delete(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getDeptId, id));
		userPositionMapper.delete(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getDeptId, id));
		// 组没了，组与角色的绑定也要一起清，否则 t_dept_role 会留下孤儿行
		deptRoleMapper.deleteByDeptId(id);
		removeById(id);
	}

	@Override
	@Caching(evict = { @CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true),
			@CacheEvict(cacheNames = CacheConsts.userCacheName, allEntries = true) })
	public void sortDept(DeptSortRequest request) {
		for (int i = 0; i < request.getNodes().size(); i++) {
			Dept dept = getById(request.getNodes().get(i));
			dept.setSortCode(i);
			updateById(dept);
		}
	}

}
