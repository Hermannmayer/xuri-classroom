package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ClassMemberCreateRequest;
import cn.surveyking.server.domain.dto.ClassMemberView;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.ClassPartnerRequest;
import cn.surveyking.server.domain.dto.ClassTeacherView;
import cn.surveyking.server.domain.dto.UserOptionView;
import cn.surveyking.server.domain.dto.UserRequest;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.ClassPartner;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.domain.model.UserRole;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.ClassPartnerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.RoleMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.mapper.UserRoleMapper;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.UserService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import javax.validation.ValidationException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 班级管理实现。
 *
 * <p>可见范围（三档，越往下越宽）：
 * <ul>
 * <li>班主任：自己创建（create_by）或负责（manager_id）的班；含其下级班；</li>
 * <li>被授权老师：t_class_partner 里的班；授权一个班含其下级班；</li>
 * <li>管理员 / class:grant：全部班级，用于分配。</li>
 * </ul>
 * 树里额外补上祖先节点，否则被授权的班在树里没有路径可显示。
 */
@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class ClassServiceImpl implements ClassService {

	private static final String ROOT_DEPT_PARENT_ID = "0";

	private static final int TEACHER_OPTION_LIMIT = 200;

	private final DeptMapper deptMapper;

	private final UserMapper userMapper;

	private final AccountMapper accountMapper;

	private final UserDeptMapper userDeptMapper;

	private final UserRoleMapper userRoleMapper;

	private final RoleMapper roleMapper;

	private final ClassPartnerMapper classPartnerMapper;

	private final UserService userService;

	@Override
	public List<ClassNodeView> listClassTree(String keyword) {
		List<Dept> depts = deptMapper.selectList(Wrappers.<Dept>lambdaQuery().orderByAsc(Dept::getSortCode));
		if (depts.isEmpty()) {
			return Collections.emptyList();
		}
		Map<String, Dept> byId = depts.stream().filter(d -> StringUtils.hasText(d.getId()))
				.collect(Collectors.toMap(Dept::getId, d -> d, (a, b) -> a, LinkedHashMap::new));
		Set<String> visible = visibleDeptIds(depts, byId);
		if (visible.isEmpty()) {
			return Collections.emptyList();
		}
		Map<String, List<Dept>> childMap = depts.stream()
				.filter(d -> StringUtils.hasText(d.getParentId()) && byId.containsKey(d.getParentId()))
				.collect(Collectors.groupingBy(Dept::getParentId, LinkedHashMap::new, Collectors.toList()));
		Set<String> include = withAncestors(visible, byId);
		Map<String, Long> counts = countMembers(visible);
		Map<String, String> managerNames = new HashMap<>();
		List<ClassNodeView> roots = new ArrayList<>();
		for (Dept dept : depts) {
			if (!include.contains(dept.getId())) {
				continue;
			}
			// 父节点不在结果里 → 这是当前可见子树的根
			if (!StringUtils.hasText(dept.getParentId()) || !include.contains(dept.getParentId())
					|| ROOT_DEPT_PARENT_ID.equals(dept.getParentId())) {
				roots.add(toNode(dept, childMap, include, counts, managerNames));
			}
		}
		if (!StringUtils.hasText(keyword)) {
			return roots;
		}
		return filterByKeyword(roots, keyword.trim());
	}

	@Override
	public List<ClassMemberView> listClassMembers(String deptId) {
		Dept dept = assertClassVisible(deptId);
		List<User> users = userMapper.selectList(Wrappers.<User>lambdaQuery()
				.and(w -> w.eq(User::getDeptId, deptId).or()
						.apply("EXISTS (SELECT 1 FROM t_user_dept ud WHERE ud.user_id = t_user.id AND ud.dept_id = {0} AND ud.is_deleted = 0)",
								deptId))
				.orderByDesc(User::getCreateAt));
		if (users.isEmpty()) {
			return Collections.emptyList();
		}
		List<String> userIds = users.stream().map(User::getId).collect(Collectors.toList());
		Map<String, String> usernames = accountMapper
				.selectList(Wrappers.<Account>lambdaQuery().in(Account::getUserId, userIds)
						.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()))
				.stream().filter(a -> StringUtils.hasText(a.getUserId()))
				.collect(Collectors.toMap(Account::getUserId, Account::getAuthAccount, (a, b) -> a));
		Map<String, List<String>> roleNames = loadRoleNames(userIds);
		return users.stream().map(user -> {
			ClassMemberView view = new ClassMemberView();
			view.setId(user.getId());
			view.setName(user.getName());
			view.setUsername(usernames.get(user.getId()));
			view.setStatus(user.getStatus());
			view.setDeptId(dept.getId());
			view.setDeptName(dept.getName());
			view.setCreateAt(user.getCreateAt());
			view.setRoleNames(roleNames.getOrDefault(user.getId(), Collections.emptyList()));
			return view;
		}).collect(Collectors.toList());
	}

	@Override
	public List<ClassTeacherView> listClassTeachers(String deptId) {
		assertClassVisible(deptId);
		List<ClassPartner> partners = classPartnerMapper
				.selectList(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getDeptId, deptId)
						.orderByAsc(ClassPartner::getCreateAt));
		if (partners.isEmpty()) {
			return Collections.emptyList();
		}
		Set<String> userIds = partners.stream().map(ClassPartner::getUserId).filter(StringUtils::hasText)
				.collect(Collectors.toSet());
		Map<String, User> users = userIds.isEmpty() ? Collections.emptyMap()
				: userMapper.selectBatchIds(userIds).stream().filter(Objects::nonNull)
						.collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
		List<ClassTeacherView> result = new ArrayList<>();
		for (ClassPartner partner : partners) {
			ClassTeacherView view = new ClassTeacherView();
			view.setId(partner.getId());
			view.setUserId(partner.getUserId());
			view.setCreateAt(partner.getCreateAt());
			User user = users.get(partner.getUserId());
			if (user != null) {
				view.setUserName(user.getName());
				if (StringUtils.hasText(user.getDeptId())) {
					Dept dept = deptMapper.selectById(user.getDeptId());
					view.setDeptName(dept == null ? null : dept.getName());
				}
			}
			result.add(view);
		}
		return result;
	}

	@Override
	public List<UserOptionView> listTeacherOptions(String keyword) {
		List<User> users = userMapper.selectList(Wrappers.<User>lambdaQuery()
				.like(StringUtils.hasText(keyword), User::getName, keyword)
				.orderByAsc(User::getName).last("LIMIT " + TEACHER_OPTION_LIMIT));
		if (users.isEmpty()) {
			return Collections.emptyList();
		}
		List<String> userIds = users.stream().map(User::getId).collect(Collectors.toList());
		Map<String, String> usernames = accountMapper
				.selectList(Wrappers.<Account>lambdaQuery().in(Account::getUserId, userIds)
						.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()))
				.stream().filter(a -> StringUtils.hasText(a.getUserId()))
				.collect(Collectors.toMap(Account::getUserId, Account::getAuthAccount, (a, b) -> a));
		Set<String> deptIds = users.stream().map(User::getDeptId).filter(StringUtils::hasText).collect(Collectors.toSet());
		Map<String, String> deptNames = deptIds.isEmpty() ? Collections.emptyMap()
				: deptMapper.selectBatchIds(deptIds).stream().filter(Objects::nonNull)
						.collect(Collectors.toMap(Dept::getId, Dept::getName, (a, b) -> a));
		return users.stream().map(user -> {
			UserOptionView view = new UserOptionView();
			view.setId(user.getId());
			view.setName(user.getName());
			view.setUsername(usernames.get(user.getId()));
			view.setDeptName(user.getDeptId() == null ? null : deptNames.get(user.getDeptId()));
			return view;
		}).collect(Collectors.toList());
	}

	@Override
	public void addClassPartners(ClassPartnerRequest request) {
		if (!StringUtils.hasText(request.getDeptId())) {
			throw new ValidationException("缺少班级 id");
		}
		if (deptMapper.selectById(request.getDeptId()) == null) {
			throw new ValidationException("班级不存在");
		}
		if (CollectionUtils.isEmpty(request.getUserIds())) {
			return;
		}
		List<String> userIds = request.getUserIds().stream().filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
		if (userIds.isEmpty()) {
			return;
		}
		Set<String> existUsers = userMapper.selectBatchIds(userIds).stream().filter(Objects::nonNull).map(User::getId)
				.collect(Collectors.toSet());
		if (existUsers.size() != userIds.size()) {
			throw new ValidationException("部分用户不存在，请刷新后重试");
		}
		Set<String> granted = classPartnerMapper
				.selectList(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getDeptId, request.getDeptId())
						.in(ClassPartner::getUserId, userIds))
				.stream().map(ClassPartner::getUserId).collect(Collectors.toSet());
		for (String userId : userIds) {
			if (granted.contains(userId)) {
				continue;
			}
			ClassPartner partner = new ClassPartner();
			partner.setDeptId(request.getDeptId());
			partner.setUserId(userId);
			classPartnerMapper.insert(partner);
		}
	}

	@Override
	public void deleteClassPartner(ClassPartnerRequest request) {
		if (!StringUtils.hasText(request.getDeptId()) || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少授权记录 id");
		}
		classPartnerMapper.hardDelete(request.getId(), request.getDeptId());
	}

	@Override
	public void createClassMember(ClassMemberCreateRequest request) {
		if (request == null || !StringUtils.hasText(request.getDeptId())) {
			throw new ValidationException("缺少班级 id");
		}
		assertClassVisible(request.getDeptId());
		if (!StringUtils.hasText(request.getName())) {
			throw new ValidationException("请填写学员姓名");
		}
		if (!StringUtils.hasText(request.getUsername())) {
			throw new ValidationException("请填写登录账号");
		}
		if (!StringUtils.hasText(request.getPassword())) {
			throw new ValidationException("请填写初始密码");
		}
		if (userService.checkUsernameExist(request.getUsername().trim())) {
			throw new ValidationException("登录账号已存在");
		}
		UserRequest userRequest = new UserRequest();
		userRequest.setName(request.getName().trim());
		userRequest.setUsername(request.getUsername().trim());
		userRequest.setPassword(request.getPassword());
		userRequest.setPhone(request.getPhone());
		userRequest.setEmail(request.getEmail());
		userRequest.setDeptId(request.getDeptId());
		userRequest.setDeptIds(Collections.emptyList());
		try {
			userService.createClassStudent(userRequest);
		}
		catch (org.springframework.dao.DuplicateKeyException ex) {
			// 并发下 checkUsernameExist 可能漏掉，唯一键冲突统一给用户可读提示
			throw new ValidationException("登录账号已存在");
		}
	}

	// ---------------------------------------------------------------- 可见性

	private Set<String> visibleDeptIds(List<Dept> depts, Map<String, Dept> byId) {
		String currentUserId = SecurityContextUtils.getUserId();
		boolean seeAll = SecurityContextUtils.isAdmin()
				|| SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode());
		if (seeAll) {
			return depts.stream().map(Dept::getId).filter(StringUtils::hasText).collect(Collectors.toCollection(LinkedHashSet::new));
		}
		Set<String> roots = new LinkedHashSet<>();
		for (Dept dept : depts) {
			if (Objects.equals(currentUserId, dept.getCreateBy()) || Objects.equals(currentUserId, dept.getManagerId())) {
				roots.add(dept.getId());
			}
		}
		classPartnerMapper.selectList(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getUserId, currentUserId))
				.forEach(partner -> {
					if (StringUtils.hasText(partner.getDeptId()) && byId.containsKey(partner.getDeptId())) {
						roots.add(partner.getDeptId());
					}
				});
		if (roots.isEmpty()) {
			return Collections.emptySet();
		}
		Map<String, List<Dept>> childMap = depts.stream()
				.filter(d -> StringUtils.hasText(d.getParentId()))
				.collect(Collectors.groupingBy(Dept::getParentId));
		Set<String> visible = new LinkedHashSet<>(roots);
		Deque<String> queue = new ArrayDeque<>(roots);
		while (!queue.isEmpty()) {
			String parent = queue.poll();
			for (Dept child : childMap.getOrDefault(parent, Collections.emptyList())) {
				if (visible.add(child.getId())) {
					queue.add(child.getId());
				}
			}
		}
		return visible;
	}

	/** 补上祖先节点，保证被授权的班在树里有路径可显示 */
	private Set<String> withAncestors(Set<String> visible, Map<String, Dept> byId) {
		Set<String> include = new LinkedHashSet<>(visible);
		for (String id : visible) {
			Dept current = byId.get(id);
			int depth = 0;
			while (current != null && StringUtils.hasText(current.getParentId())
					&& !ROOT_DEPT_PARENT_ID.equals(current.getParentId()) && depth++ < 64) {
				if (!include.add(current.getParentId())) {
					break;
				}
				current = byId.get(current.getParentId());
			}
		}
		return include;
	}

	private ClassNodeView toNode(Dept dept, Map<String, List<Dept>> childMap, Set<String> include,
			Map<String, Long> counts, Map<String, String> managerNames) {
		ClassNodeView view = new ClassNodeView();
		view.setId(dept.getId());
		view.setName(dept.getName());
		view.setParentId(dept.getParentId());
		view.setManagerId(dept.getManagerId());
		view.setMemberCount(counts.getOrDefault(dept.getId(), 0L));
		if (StringUtils.hasText(dept.getManagerId())) {
			view.setManagerName(managerNames.computeIfAbsent(dept.getManagerId(), userId -> {
				User user = userMapper.selectById(userId);
				return user == null ? null : user.getName();
			}));
		}
		view.setChildren(childMap.getOrDefault(dept.getId(), Collections.emptyList()).stream()
				.filter(child -> include.contains(child.getId()))
				.map(child -> toNode(child, childMap, include, counts, managerNames)).collect(Collectors.toList()));
		return view;
	}

	private List<ClassNodeView> filterByKeyword(List<ClassNodeView> nodes, String keyword) {
		List<ClassNodeView> result = new ArrayList<>();
		for (ClassNodeView node : nodes) {
			List<ClassNodeView> children = filterByKeyword(
					node.getChildren() == null ? Collections.emptyList() : node.getChildren(), keyword);
			boolean hit = node.getName() != null && node.getName().contains(keyword);
			if (hit || !children.isEmpty()) {
				node.setChildren(children);
				result.add(node);
			}
		}
		return result;
	}

	private Map<String, Long> countMembers(Set<String> deptIds) {
		Map<String, Long> counts = new HashMap<>();
		if (deptIds.isEmpty()) {
			return counts;
		}
		userMapper.selectList(Wrappers.<User>lambdaQuery().select(User::getDeptId).in(User::getDeptId, deptIds))
				.forEach(user -> counts.merge(user.getDeptId(), 1L, Long::sum));
		userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery().in(UserDept::getDeptId, deptIds))
				.forEach(userDept -> counts.merge(userDept.getDeptId(), 1L, Long::sum));
		return counts;
	}

	/**
	 * 判断当前用户能否看这个班：自己创建/负责、被授权（含授权在祖先班）、或管理员/class:grant。
	 * @return 班级实体，供调用方复用
	 */
	private Dept assertClassVisible(String deptId) {
		if (!StringUtils.hasText(deptId)) {
			throw new ValidationException("缺少班级 id");
		}
		Dept dept = deptMapper.selectById(deptId);
		if (dept == null) {
			throw new ValidationException("班级不存在");
		}
		if (SecurityContextUtils.isAdmin() || SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode())) {
			return dept;
		}
		String currentUserId = SecurityContextUtils.getUserId();
		List<String> chain = ancestorChain(deptId);
		Map<String, Dept> byId = new HashMap<>();
		byId.put(dept.getId(), dept);
		for (String id : chain) {
			Dept current = byId.computeIfAbsent(id, deptMapper::selectById);
			if (current != null && (Objects.equals(currentUserId, current.getCreateBy())
					|| Objects.equals(currentUserId, current.getManagerId()))) {
				return dept;
			}
		}
		boolean granted = classPartnerMapper
				.selectCount(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getUserId, currentUserId)
						.in(ClassPartner::getDeptId, chain)) > 0;
		if (granted) {
			return dept;
		}
		throw new AccessDeniedException("没有权限查看该班级，请联系管理员分配");
	}

	/** 自身 + 祖先链（不含根 "0"），用于「授权一个班含下级班」的向上匹配 */
	private List<String> ancestorChain(String deptId) {
		List<String> chain = new ArrayList<>();
		String cursor = deptId;
		int depth = 0;
		while (StringUtils.hasText(cursor) && !ROOT_DEPT_PARENT_ID.equals(cursor) && depth++ < 64) {
			chain.add(cursor);
			Dept dept = deptMapper.selectById(cursor);
			cursor = dept == null ? null : dept.getParentId();
		}
		return chain;
	}

	private Map<String, List<String>> loadRoleNames(List<String> userIds) {
		List<UserRole> userRoles = userRoleMapper
				.selectList(Wrappers.<UserRole>lambdaQuery().in(UserRole::getUserId, userIds));
		if (userRoles.isEmpty()) {
			return Collections.emptyMap();
		}
		Set<String> roleIds = userRoles.stream().map(UserRole::getRoleId).filter(StringUtils::hasText)
				.collect(Collectors.toSet());
		Map<String, String> roleNameById = roleIds.isEmpty() ? Collections.emptyMap()
				: roleMapper.selectBatchIds(roleIds).stream().filter(Objects::nonNull)
						.collect(Collectors.toMap(Role::getId, Role::getName, (a, b) -> a));
		Map<String, List<String>> result = new HashMap<>();
		for (UserRole userRole : userRoles) {
			String roleName = roleNameById.get(userRole.getRoleId());
			if (roleName != null) {
				result.computeIfAbsent(userRole.getUserId(), key -> new ArrayList<>()).add(roleName);
			}
		}
		return result;
	}

}
