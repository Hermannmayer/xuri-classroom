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

import javax.validation.ValidationException;
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

	/** 删除组时的成员处理方式：迁移到其他组 */
	private static final String MEMBER_ACTION_MOVE = "MOVE";

	/** 删除组时的成员处理方式：移出分组（主组置空） */
	private static final String MEMBER_ACTION_UNASSIGN = "UNASSIGN";

	/** 删除预检里最多回显多少个成员姓名 */
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
		// deptType 非空时只查该类型（用户组页传 org）；为空则不过滤，保持「全量组织树」的老语义，
		// 也保住接口上 @Cacheable(condition = "#p0 == null") 的缓存命中
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
		// 类型：不传默认 org（用户组）；只接受 org / class
		String deptType = normalizeDeptType(request.getDeptType());
		request.setDeptType(deptType);
		assertParentDeptType(request.getParentId(), deptType);
		Dept dept = deptDtoMapper.fromRequest(request);
		// 顶层节点（parent 为空）统一挂到 "0"；排序号也按这个真实父节点算，
		// 否则老师建多个顶层班级时 sort_code 全是 0，班级树的顺序会不稳定
		String parentId = StringUtils.isEmpty(request.getParentId()) ? ROOT_DEPT_PARENT_ID : request.getParentId();
		dept.setParentId(parentId);
		// short_name 在库里是 NOT NULL 且无默认值，不传会直接 SQL 500
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
		// 类型是节点的身份：org 与 class 之间不能靠更新互相转换，否则一棵树又会混起来
		Dept current = requireDept(request.getId());
		String currentType = deptTypeOf(current);
		if (isNotBlank(request.getDeptType()) && !Objects.equals(currentType, normalizeDeptType(request.getDeptType()))) {
			throw new ValidationException("不能修改用户组类型");
		}
		// 只有真的换了上级才校验父节点类型：迁移前就挂在 org 根下的老班级，改名不能被这条挡住
		if (isNotBlank(request.getParentId()) && !ROOT_DEPT_PARENT_ID.equals(request.getParentId())
				&& !Objects.equals(request.getParentId(), current.getParentId())) {
			assertParentDeptType(request.getParentId(), currentType);
		}
		// 无论前端传什么，落库的 dept_type 永远是现有类型
		request.setDeptType(currentType);
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
		assertGrantableDeptChain(parentId, deptMap, "不能把用户组挂到这个上级组下：上级链上绑定的角色");
	}

	/**
	 * 非管理员把用户 / 整棵子树放到 {@code targetDeptId} 下时，目标组祖先链（含目标本身）绑定的角色
	 * 必须都是调用者可授予的；否则等于借「改组 / 迁人」把成员塞进高权限组。
	 *
	 * <p>孤儿绑定（角色已被删）不授予任何权限，忽略；管理员不受限。
	 */
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
			// 孤儿绑定（角色已被删）不授予任何权限，忽略
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

	/**
	 * 兼容旧调用：等价于「不指定成员处理方式」的删除。组里还有成员时仍然报错，要求调用方
	 * 改用 {@link #deleteDept(DeptDeleteRequest)} 明确 MOVE / UNASSIGN。
	 */
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
		// 「最后一个」要按同类型算：用户组和班级是两棵互不相干的使用场景，
		// 用全表数量会让「只剩一个用户组但有 10 个班级」时判成不是最后一个
		view.setLastDept(count(Wrappers.<Dept>lambdaQuery().eq(Dept::getDeptType, deptTypeOf(dept))) <= 1);
		return view;
	}

	/**
	 * 删除用户组。
	 *
	 * <p>规则：
	 * <ol>
	 * <li>有子组：拒绝，要求先删除 / 移动子组（避免整棵子树被静默留下孤儿节点）；</li>
	 * <li>有成员但没有 {@code memberAction}：拒绝，要求显式选择「迁移」或「移出分组」。
	 * 旧实现是一律拒绝，线上「最后一个组 + 1 名成员」因此永远删不掉；</li>
	 * <li>{@code UNASSIGN}：主组成员 {@code t_user.dept_id} 置 NULL，账号与角色不动；</li>
	 * <li>{@code MOVE}：主组成员迁到目标组。目标必须存在、不是本组 / 子组；非管理员还必须能
	 * 授予目标组祖先链上的全部角色（复用 {@link #assertGrantableDeptChain}）。</li>
	 * </ol>
	 * 其余清理保持原样：授权记录、岗位、组角色、逻辑删除。
	 */
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
		// 该组自己的附加组绑定一律清掉（组都要删了，绑定不能留）。
		// 这里走 BaseMapper 的逻辑删除；重写附加组的 saveUserDepts 会先物理清空该用户的全部行，
		// 所以软删行不会在「重新加入某个组」时撞 (user_id, dept_id) 唯一键。
		userDeptMapper.delete(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getDeptId, id));
		repoPartnerMapper.delete(Wrappers.<RepoPartner>lambdaQuery().eq(RepoPartner::getDeptId, id));
		projectPartnerMapper.delete(Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getGroupId, id));
		classPartnerMapper.delete(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getDeptId, id));
		// 班级资源分配（考试/问卷窗口）也要跟着走，不能留孤儿行
		classResourceMapper.hardDeleteByClassId(id);
		userPositionMapper.delete(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getDeptId, id));
		// 组没了，组与角色的绑定也要一起清，否则 t_dept_role 会留下孤儿行
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
	}

	private List<User> loadPrimaryMembers(String deptId) {
		return userMapper.selectList(
				Wrappers.<User>lambdaQuery().select(User::getId, User::getName).eq(User::getDeptId, deptId));
	}

	/**
	 * 主组成员姓名在前、附加组成员姓名在后，去重后最多 {@link #MEMBER_NAME_LIMIT} 个。
	 * 只用于展示，不能据此判断成员总数。
	 */
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

	/**
	 * 迁移目标校验：必须存在、不能是本组，也不能是本组的子孙；非管理员还必须能授予
	 * 目标组祖先链（含目标本身）绑定的角色，和「改组上级」是同一套提权保护。
	 */
	private void assertMoveTargetAllowed(String sourceDeptId, String targetDeptId) {
		if (targetDeptId.equals(sourceDeptId)) {
			throw new ValidationException("不能把成员迁移到正在删除的用户组");
		}
		Map<String, Dept> deptMap = loadDeptMap();
		if (!deptMap.containsKey(targetDeptId)) {
			throw new ValidationException("目标用户组不存在或已删除");
		}
		// 学员只能在班级之间迁移、教职工只能在用户组之间迁移：混着迁会把两类节点又搅到一起
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
		// 主组已经是目标组的人，再把目标组挂在「附加组」上就重复了；顺手清掉这些绑定
		// （同样是逻辑删，后续 saveUserDepts 重写附加组时会物理清掉旧行）
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
