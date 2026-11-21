package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.DeptDeleteCheckView;
import cn.surveyking.server.domain.dto.DeptDeleteRequest;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.DeptSortRequest;
import cn.surveyking.server.domain.dto.DeptView;
import cn.surveyking.server.domain.dto.SelectDeptRequest;
import cn.surveyking.server.domain.mapper.DeptDtoMapper;
import cn.surveyking.server.domain.model.ClassPartner;
import cn.surveyking.server.domain.model.ClassResource;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.DeptRole;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.domain.model.RepoPartner;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.domain.model.UserPosition;
import cn.surveyking.server.mapper.ClassPartnerMapper;
import cn.surveyking.server.mapper.ClassResourceMapper;
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

import jakarta.validation.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isNotBlank;





@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class DeptServiceImpl extends BaseService<DeptMapper, Dept> implements DeptService {


	private static final String ROOT_DEPT_PARENT_ID = "0";


	private static final String MEMBER_ACTION_MOVE = "MOVE";


	private static final String MEMBER_ACTION_UNASSIGN = "UNASSIGN";


	private static final int MEMBER_NAME_LIMIT = 10;

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

	private final ClassResourceMapper classResourceMapper;

	private final CacheManager cacheManager;

	@Override
	public List<DeptView> listDept(SelectDeptRequest request) {
		if (request == null) {
			request = new SelectDeptRequest();
		}


		String deptType = normalizeQueryDeptType(request.getDeptType());
		List<DeptView> result = deptDtoMapper.toView(list(Wrappers.<Dept>lambdaQuery()
				.eq(deptType != null, Dept::getDeptType, deptType)
				.in(!CollectionUtils.isEmpty(request.getSelected()), Dept::getId, request.getSelected())
				.orderByAsc(Dept::getSortCode)));
		result.forEach(orgView -> {
			String managerId = orgView.getManagerId();
			if (isNotBlank(managerId)) {
				orgView.setManagerName(userService.loadUserById(managerId).getName());
			}

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













	@Override
	@Caching(evict = { @CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true),
			@CacheEvict(cacheNames = CacheConsts.userCacheName, allEntries = true) })
	public void addDept(DeptRequest request) {

		String deptType = normalizeDeptType(request.getDeptType());
		request.setDeptType(deptType);
		String classKind = Dept.TYPE_CLASS.equals(deptType) ? normalizeClassKind(request.getClassKind()) : null;
		request.setClassKind(classKind);
		assertParentDeptType(request.getParentId(), deptType);
		Dept dept = deptDtoMapper.fromRequest(request);
		dept.setClassKind(classKind);

		dept.setAllowRegister(Dept.TYPE_CLASS.equals(deptType) && Dept.CLASS_KIND_TEACHING.equals(classKind)
				&& Boolean.TRUE.equals(request.getAllowRegister()));


		String parentId = StringUtils.isEmpty(request.getParentId()) ? ROOT_DEPT_PARENT_ID : request.getParentId();
		dept.setParentId(parentId);

		if (StringUtils.isEmpty(dept.getShortName())) {
			dept.setShortName(dept.getName());
		}
		dept.setSortCode((int) count(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, parentId)));
		save(dept);
		saveDeptRoles(dept.getId(), request.getRoleIds());
	}

	@Override
	@Caching(evict = { @CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true),
			@CacheEvict(cacheNames = CacheConsts.userCacheName, allEntries = true) })
	public void updateDept(DeptRequest request) {

		Dept current = requireDept(request.getId());
		String currentType = deptTypeOf(current);
		if (isNotBlank(request.getDeptType()) && !Objects.equals(currentType, normalizeDeptType(request.getDeptType()))) {
			throw new ValidationException("不能修改用户组类型");
		}

		if (isNotBlank(request.getParentId()) && !ROOT_DEPT_PARENT_ID.equals(request.getParentId())
				&& !Objects.equals(request.getParentId(), current.getParentId())) {
			assertParentDeptType(request.getParentId(), currentType);
		}

		request.setDeptType(currentType);
		assertParentPlacementAllowed(request.getId(), request.getParentId());
		String currentKind = Dept.TYPE_CLASS.equals(currentType) ? classKindOf(current) : null;
		String nextKind = Dept.TYPE_CLASS.equals(currentType)
				? normalizeClassKind(request.getClassKind() != null ? request.getClassKind() : currentKind)
				: null;
		if (Dept.TYPE_CLASS.equals(currentType) && !Objects.equals(currentKind, nextKind)) {
			assertClassKindChangeAllowed(current, currentKind, nextKind);
		}
		request.setClassKind(nextKind);
		Dept update = deptDtoMapper.fromRequest(request);
		update.setClassKind(nextKind);

		if (Dept.TYPE_CLASS.equals(currentType) && Dept.CLASS_KIND_TEACHING.equals(nextKind)) {
			update.setAllowRegister(request.getAllowRegister() != null ? request.getAllowRegister()
					: Boolean.TRUE.equals(current.getAllowRegister()));
		}
		else {
			update.setAllowRegister(false);
		}
		updateById(update);

		if (request.getRoleIds() != null) {
			saveDeptRoles(request.getId(), request.getRoleIds());
		}
	}

	/** 改「上级组」会把整棵子树挪到新的祖先链下，组内成员因此继承新祖先绑定的角色—— 这是一条绕过 #assertGrantableDeptRoles(List) 的提权路径（自己绑不了 teacher， 但把自己所在的组挂到「绑了 teacher 的组」下面就行） */
	private void assertParentPlacementAllowed(String deptId, String parentId) {
		if (!isNotBlank(deptId) || !isNotBlank(parentId) || ROOT_DEPT_PARENT_ID.equals(parentId)) {

			return;
		}
		Map<String, Dept> deptMap = loadDeptMap();
		if (parentId.equals(deptId)) {
			throw new IllegalArgumentException("上级用户组不能是自己");
		}

		Set<String> visited = new HashSet<>();
		String cursor = parentId;
		while (isNotBlank(cursor) && !ROOT_DEPT_PARENT_ID.equals(cursor) && visited.add(cursor)) {
			if (cursor.equals(deptId)) {
				throw new IllegalArgumentException("不能把用户组移动到自己的子组下面");
			}
			Dept dept = deptMap.get(cursor);
			cursor = dept == null ? null : dept.getParentId();
		}
		assertGrantableDeptChain(parentId, deptMap, "不能把用户组挂到这个上级组下：上级链上绑定的角色");
	}

	/** 非管理员把用户 / 整棵子树放到 targetDeptId 下时，目标组祖先链（含目标本身）绑定的角色 */
	private void assertGrantableDeptChain(String targetDeptId, Map<String, Dept> deptMap, String messagePrefix) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		Set<String> roleIds = boundRoleIds(ancestorChain(targetDeptId, deptMap));
		if (roleIds.isEmpty()) {
			return;
		}
		Set<String> callerAuthorities = SecurityContextUtils.getUser().getAuthorities().stream()
				.map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
		for (Role role : roleMapper.selectBatchIds(roleIds)) {

			if (role == null || !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID)) {
				continue;
			}
			Set<String> roleAuthorities = toRoleAuthorities(role);
			if (roleAuthorities.contains(AppConsts.ROLE_ADMIN) || !callerAuthorities.containsAll(roleAuthorities)) {
				throw new AccessDeniedException(messagePrefix + "「" + role.getName() + "」权限高于当前用户");
			}
		}
	}

	/** 一次取出全部用户组（组表很小），供祖先链解析复用 */
	private Map<String, Dept> loadDeptMap() {

		return list((com.baomidou.mybatisplus.core.conditions.Wrapper<Dept>) null).stream().filter(Objects::nonNull)
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

	/** 组→角色绑定：先删后插，保证与界面勾选一致；用物理删除，避免软删行撞 (dept_id, role_id) 唯一键 */
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

	/** 组绑角色等于「一次性给组内所有人加角色」，不能让人借编辑用户组提权： 调用者必须拥有待绑定角色的全部权限串，且不能把超级管理员角色绑到组上 */
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
		DeptDeleteRequest request = new DeptDeleteRequest();
		request.setId(id);
		deleteDept(request);
	}

	@Override
	public DeptDeleteCheckView deleteCheck(String id) {
		Dept dept = requireDept(id);
		List<Dept> children = list(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, dept.getId()));
		List<User> primaryMembers = loadPrimaryMembers(dept.getId());
		List<UserDept> extraBindings = userDeptMapper
				.selectList(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getDeptId, dept.getId()));
		DeptDeleteCheckView view = new DeptDeleteCheckView();
		view.setId(dept.getId());
		view.setName(dept.getName());
		view.setChildCount(children.size());
		view.setChildNames(children.stream().map(Dept::getName).filter(Objects::nonNull).collect(Collectors.toList()));
		view.setPrimaryMemberCount(primaryMembers.size());
		view.setExtraMemberCount(extraBindings.size());
		view.setMemberNames(collectMemberNames(primaryMembers, extraBindings));


		view.setLastDept(count(Wrappers.<Dept>lambdaQuery().eq(Dept::getDeptType, deptTypeOf(dept))) <= 1);
		return view;
	}















	@Override
	@Caching(evict = { @CacheEvict(cacheNames = CacheConsts.deptCacheName, allEntries = true),
			@CacheEvict(cacheNames = CacheConsts.userCacheName, allEntries = true) })
	public void deleteDept(DeptDeleteRequest request) {
		if (request == null || !isNotBlank(request.getId())) {
			return;
		}
		String id = request.getId().trim();
		requireDept(id);
		List<Dept> children = list(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, id));
		if (!children.isEmpty()) {
			String names = children.stream().map(Dept::getName).filter(Objects::nonNull).limit(5)
					.collect(Collectors.joining("、"));
			throw new ValidationException("这个用户组下面还有子组" + (names.isEmpty() ? "" : "（" + names + "）")
					+ "，请先删除或移动子组");
		}
		List<User> primaryMembers = loadPrimaryMembers(id);
		List<UserDept> extraBindings = userDeptMapper
				.selectList(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getDeptId, id));
		long memberCount = (long) primaryMembers.size() + extraBindings.size();
		String memberAction = normalizeMemberAction(request.getMemberAction());
		if (memberCount > 0 && memberAction == null) {
			throw new ValidationException("这个用户组还有 " + memberCount + " 名成员，请选择迁移到其他组或移出分组");
		}
		if (MEMBER_ACTION_MOVE.equals(memberAction)) {
			String moveToDeptId = request.getMoveToDeptId() == null ? null : request.getMoveToDeptId().trim();
			if (!isNotBlank(moveToDeptId)) {
				throw new ValidationException("请选择要迁移到的用户组");
			}
			assertMoveTargetAllowed(id, moveToDeptId);
			movePrimaryMembers(primaryMembers, id, moveToDeptId);
		}
		else if (MEMBER_ACTION_UNASSIGN.equals(memberAction)) {
			unassignPrimaryMembers(id);
		}



		userDeptMapper.delete(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getDeptId, id));
		repoPartnerMapper.delete(Wrappers.<RepoPartner>lambdaQuery().eq(RepoPartner::getDeptId, id));
		projectPartnerMapper.delete(Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getGroupId, id));
		classPartnerMapper.delete(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getDeptId, id));

		classResourceMapper.hardDeleteByClassId(id);
		userPositionMapper.delete(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getDeptId, id));

		deptRoleMapper.deleteByDeptId(id);
		removeById(id);
	}

	private Dept requireDept(String id) {
		if (!isNotBlank(id)) {
			throw new ValidationException("用户组 id 不能为空");
		}
		Dept dept = getById(id);
		if (dept == null) {
			throw new ValidationException("用户组不存在或已删除");
		}
		return dept;
	}

	/** 规范化请求里的 dept_type：空 → org（用户组）；只接受 org / class，其它值报错 */
	private String normalizeDeptType(String deptType) {
		if (!isNotBlank(deptType)) {
			return Dept.TYPE_ORG;
		}
		String normalized = deptType.trim().toLowerCase(Locale.ROOT);
		if (!Dept.TYPE_ORG.equals(normalized) && !Dept.TYPE_CLASS.equals(normalized)) {
			throw new ValidationException("用户组类型不合法");
		}
		return normalized;
	}

	/** 列表筛选用的类型：空 / 非法值都返回 null（不过滤），查询接口不因为参数脏就报错 */
	private String normalizeQueryDeptType(String deptType) {
		if (!isNotBlank(deptType)) {
			return null;
		}
		String normalized = deptType.trim().toLowerCase(Locale.ROOT);
		return Dept.TYPE_CLASS.equals(normalized) || Dept.TYPE_ORG.equals(normalized) ? normalized : null;
	}

	/** 库里存的类型：历史数据为空 / 脏值时一律按 org（用户组）解释 */
	private String deptTypeOf(Dept dept) {
		return dept != null && Dept.TYPE_CLASS.equals(dept.getDeptType()) ? Dept.TYPE_CLASS : Dept.TYPE_ORG;
	}

	/** 上级节点必须与本次类型一致：用户组挂在用户组下，班级挂在班级下 */
	private void assertParentDeptType(String parentId, String deptType) {
		if (!isNotBlank(parentId) || ROOT_DEPT_PARENT_ID.equals(parentId)) {
			return;
		}
		Dept parent = getById(parentId);
		if (parent == null || !Objects.equals(deptTypeOf(parent), deptType)) {
			throw new ValidationException("上级用户组/班级类型不一致");
		}

		if (Dept.TYPE_CLASS.equals(deptType) && !Dept.CLASS_KIND_GROUP.equals(classKindOf(parent))) {
			throw new ValidationException("教学班下面不能再建子班，请选择容器班作为上级");
		}
	}

	/** class_kind：空/非法值默认按 group；新建教学班时前端显式传 teaching */
	private String normalizeClassKind(String value) {
		return Dept.CLASS_KIND_GROUP.equalsIgnoreCase(value) ? Dept.CLASS_KIND_GROUP : Dept.CLASS_KIND_TEACHING;
	}

	/** 库里存的 class_kind：只有 teaching 是教学班，其余（含历史空值）按容器班解释 */
	private String classKindOf(Dept dept) {
		return dept != null && Dept.CLASS_KIND_TEACHING.equals(dept.getClassKind()) ? Dept.CLASS_KIND_TEACHING
				: Dept.CLASS_KIND_GROUP;
	}

	/** 容器班 ↔ 教学班互转的结构保护：  有子班的节点不能改成教学班（教学班必须是叶子） */
	private void assertClassKindChangeAllowed(Dept current, String currentKind, String nextKind) {
		boolean hasChildren = count(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, current.getId())
				.eq(Dept::getDeptType, Dept.TYPE_CLASS)) > 0;
		if (Dept.CLASS_KIND_TEACHING.equals(nextKind) && hasChildren) {
			throw new ValidationException("这个节点下面还有班级，不能改成教学班；请先把子班移走");
		}
		if (Dept.CLASS_KIND_GROUP.equals(nextKind) && Dept.CLASS_KIND_TEACHING.equals(currentKind)) {
			long students = userMapper.selectCount(Wrappers.<User>lambdaQuery().eq(User::getDeptId, current.getId()))
					+ userDeptMapper.selectCount(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getDeptId, current.getId()));
			long resources = classResourceMapper.selectCount(
					Wrappers.<ClassResource>lambdaQuery().eq(ClassResource::getClassId, current.getId()));
			if (students > 0 || resources > 0 || hasChildren) {
				throw new ValidationException("这个班还有学员/资源/子班，不能改成容器班；请先清理后再改");
			}
		}
	}

	private List<User> loadPrimaryMembers(String deptId) {
		return userMapper.selectList(
				Wrappers.<User>lambdaQuery().select(User::getId, User::getName).eq(User::getDeptId, deptId));
	}

	/** 主组成员姓名在前、附加组成员姓名在后，去重后最多 #MEMBER_NAME_LIMIT 个 */
	private List<String> collectMemberNames(List<User> primaryMembers, List<UserDept> extraBindings) {
		LinkedHashMap<String, String> names = new LinkedHashMap<>();
		for (User user : primaryMembers) {
			if (names.size() >= MEMBER_NAME_LIMIT) {
				break;
			}
			if (user != null && isNotBlank(user.getName())) {
				names.put(user.getId(), user.getName());
			}
		}
		if (names.size() < MEMBER_NAME_LIMIT && !extraBindings.isEmpty()) {
			List<String> extraUserIds = extraBindings.stream().map(UserDept::getUserId)
					.filter(StringUtils::isNotBlank).filter(userId -> !names.containsKey(userId)).distinct()
					.limit(MEMBER_NAME_LIMIT - names.size()).collect(Collectors.toList());
			if (!extraUserIds.isEmpty()) {
				for (User user : userMapper.selectBatchIds(extraUserIds)) {
					if (user != null && isNotBlank(user.getName())) {
						names.put(user.getId(), user.getName());
					}
				}
			}
		}
		return new ArrayList<>(names.values());
	}

	private String normalizeMemberAction(String memberAction) {
		if (!isNotBlank(memberAction)) {
			return null;
		}
		String normalized = memberAction.trim().toUpperCase(Locale.ROOT);
		if (MEMBER_ACTION_MOVE.equals(normalized) || MEMBER_ACTION_UNASSIGN.equals(normalized)) {
			return normalized;
		}
		throw new ValidationException("不支持的成员处理方式：" + memberAction);
	}

	/** 迁移目标校验：必须存在、不能是本组，也不能是本组的子孙；非管理员还必须能授予 目标组祖先链（含目标本身）绑定的角色，和「改组上级」是同一套提权保护 */
	private void assertMoveTargetAllowed(String sourceDeptId, String targetDeptId) {
		if (targetDeptId.equals(sourceDeptId)) {
			throw new ValidationException("不能把成员迁移到正在删除的用户组");
		}
		Map<String, Dept> deptMap = loadDeptMap();
		if (!deptMap.containsKey(targetDeptId)) {
			throw new ValidationException("目标用户组不存在或已删除");
		}

		Dept sourceDept = deptMap.get(sourceDeptId);
		Dept targetDept = deptMap.get(targetDeptId);
		if (sourceDept != null && targetDept != null
				&& !Objects.equals(deptTypeOf(sourceDept), deptTypeOf(targetDept))) {
			throw new ValidationException("只能迁移到同类型的用户组/班级");
		}
		Set<String> visited = new HashSet<>();
		String cursor = targetDeptId;
		while (isNotBlank(cursor) && !ROOT_DEPT_PARENT_ID.equals(cursor) && visited.add(cursor)) {
			if (cursor.equals(sourceDeptId)) {
				throw new ValidationException("不能把成员迁移到被删除用户组的子组");
			}
			Dept dept = deptMap.get(cursor);
			cursor = dept == null ? null : dept.getParentId();
		}
		assertGrantableDeptChain(targetDeptId, deptMap, "不能把成员迁移到这个用户组：目标组祖先链上绑定的角色");
	}

	private void unassignPrimaryMembers(String deptId) {
		userMapper.update(null, Wrappers.<User>lambdaUpdate().eq(User::getDeptId, deptId).set(User::getDeptId, null));
	}

	private void movePrimaryMembers(List<User> primaryMembers, String sourceDeptId, String targetDeptId) {
		userMapper.update(null,
				Wrappers.<User>lambdaUpdate().eq(User::getDeptId, sourceDeptId).set(User::getDeptId, targetDeptId));
		List<String> movedUserIds = primaryMembers.stream().map(User::getId).filter(StringUtils::isNotBlank).distinct()
				.collect(Collectors.toList());
		if (movedUserIds.isEmpty()) {
			return;
		}


		userDeptMapper.delete(Wrappers.<UserDept>lambdaQuery().in(UserDept::getUserId, movedUserIds)
				.eq(UserDept::getDeptId, targetDeptId));
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
