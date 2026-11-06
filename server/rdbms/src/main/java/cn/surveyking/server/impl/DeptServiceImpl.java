package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.DeptSortRequest;
import cn.surveyking.server.domain.dto.DeptView;
import cn.surveyking.server.domain.dto.SelectDeptRequest;
import cn.surveyking.server.domain.mapper.DeptDtoMapper;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.DeptRole;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.UserPosition;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.DeptRoleMapper;
import cn.surveyking.server.mapper.RoleMapper;
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

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
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

	private final DeptDtoMapper deptDtoMapper;

	private final UserService userService;

	private final UserPositionMapper userPositionMapper;

	private final DeptRoleMapper deptRoleMapper;

	private final RoleMapper roleMapper;

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
		validateAuthorityPolicy(request);
		Dept dept = deptDtoMapper.fromRequest(request);
		if (!isNotBlank(dept.getAuthorityMode())) {
			dept.setAuthorityMode("INHERIT");
		}
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
		validateAuthorityPolicy(request);
		updateById(deptDtoMapper.fromRequest(request));
		// roleIds 为 null 表示本次不改角色（只改名字/上级）；传空数组表示清空
		if (request.getRoleIds() != null) {
			saveDeptRoles(request.getId(), request.getRoleIds());
		}
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
			Set<String> roleAuthorities = new HashSet<>();
			if (isNotBlank(role.getCode())) {
				roleAuthorities.add("ROLE_" + role.getCode());
			}
			if (isNotBlank(role.getAuthority())) {
				Arrays.stream(role.getAuthority().split(",")).map(String::trim).filter(StringUtils::isNotBlank)
						.forEach(roleAuthorities::add);
			}
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

	/**
	 * 组级权限串（authority / authority_mode，INHERIT/APPEND/OVERRIDE）已废弃：
	 * 权限点只挂角色，组通过 t_dept_role 授权（见 UserServiceImpl#loadUserById）。
	 * 这里仅对旧客户端传来的字段做格式校验，字段本身不再参与权限计算，等确认无人写入后即可删除。
	 */
	private void validateAuthorityPolicy(DeptRequest request) {
		if (request == null) {
			return;
		}
		if (isNotBlank(request.getAuthorityMode())) {
			String mode = request.getAuthorityMode().trim().toUpperCase(java.util.Locale.ROOT);
			if (!"INHERIT".equals(mode) && !"APPEND".equals(mode) && !"OVERRIDE".equals(mode)) {
				throw new IllegalArgumentException("权限模式必须是 INHERIT、APPEND 或 OVERRIDE");
			}
			request.setAuthorityMode(mode);
		}
		if (isNotBlank(request.getAuthority()) && request.getAuthority().contains("ROLE_")) {
			throw new IllegalArgumentException("用户组权限不能包含 ROLE_ 身份标记");
		}
	}

	@Override
	@Caching(evict = { @CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true),
			@CacheEvict(cacheNames = CacheConsts.userCacheName, allEntries = true) })
	public void deleteDept(String id) {
		removeById(id);
		userPositionMapper.delete(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getDeptId, id));
		// 组没了，组与角色的绑定也要一起清，否则 t_dept_role 会留下孤儿行
		deptRoleMapper.deleteByDeptId(id);
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
