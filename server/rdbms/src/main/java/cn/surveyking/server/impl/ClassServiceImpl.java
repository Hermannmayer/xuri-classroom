package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AddExistingStudentsRequest;
import cn.surveyking.server.domain.dto.AddExistingStudentsResult;
import cn.surveyking.server.domain.dto.ClassMemberCreateRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportResult;
import cn.surveyking.server.domain.dto.ClassMemberUpdateRequest;
import cn.surveyking.server.domain.dto.ClassMemberView;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.ClassPartnerRequest;
import cn.surveyking.server.domain.dto.ClassTeacherView;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.PendingStudentApproveRequest;
import cn.surveyking.server.domain.dto.StudentClassAssignRequest;
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.domain.dto.UnsubmittedStudentView;
import cn.surveyking.server.domain.dto.UserOptionView;
import cn.surveyking.server.domain.dto.UserRequest;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.ClassPartner;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.DeptRole;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.domain.model.UserRole;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ClassPartnerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.DeptRoleMapper;
import cn.surveyking.server.mapper.RoleMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.mapper.UserRoleMapper;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.DeptService;
import cn.surveyking.server.service.SystemService;
import cn.surveyking.server.service.UserService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import jakarta.validation.ValidationException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
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

	/** 只读授权：能看班级与成员，不能改 */
	public static final int ACCESS_READ_ONLY = 1;

	/** 可管理授权：能增删改本班/下级班学员、批量导入 */
	public static final int ACCESS_MANAGE = 2;

	/** 只有查看权限时的统一提示（assertClassManage 抛出） */
	private static final String MANAGE_DENIED_MESSAGE = "你对该班级只有查看权限，不能修改";

	/** 未交卷名单的硬上限：班级一般几十人，不分页；上限只防「误把整届学员挂进一个班」撑爆响应 */
	private static final int UNSUBMITTED_LIMIT = 500;

	private final DeptMapper deptMapper;

	private final DeptRoleMapper deptRoleMapper;

	private final UserMapper userMapper;

	private final AccountMapper accountMapper;

	private final UserDeptMapper userDeptMapper;

	private final UserRoleMapper userRoleMapper;

	private final RoleMapper roleMapper;

	private final ClassPartnerMapper classPartnerMapper;

	private final UserService userService;

	private final SystemService systemService;

	/** 班级也是 t_dept 的一行，建班/改班复用组织树的写路径（缓存失效、上级校验都在那里） */
	private final DeptService deptService;

	/** 学员多班归属的读写已从 DeptService 拆到这里（与 UserAdminService 保持一致） */
	private final UserDeptMembershipService userDeptMembershipService;

	private final ClassStudentImportService classStudentImportService;

	/** 未交卷名单要按 create_by 反查答卷（只读，不写答卷表） */
	private final AnswerMapper answerMapper;

	/** 项目可读闸门：管理员 / 项目所有者 / 协作者；与「答卷列表」「报表」同一套口径 */
	private final AnswerAccessGuard answerAccessGuard;

	@Override
	public List<ClassNodeView> listClassTree(String keyword) {
		// 班级树只装班级：用户组（org）是教职工的组织，不进班级页
		List<Dept> depts = deptMapper.selectList(
				Wrappers.<Dept>lambdaQuery().eq(Dept::getDeptType, Dept.TYPE_CLASS).orderByAsc(Dept::getSortCode));
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
		Map<String, List<String>> roleIdsByDept = loadDeptRoleIds(include);
		// 能不能改这个班（增删改学员）：与 assertClassManage 同一套口径，只是这里一次算完整棵树
		Set<String> manageable = manageableDeptIds(depts, byId);
		Map<String, String> managerNames = new HashMap<>();
		List<ClassNodeView> roots = new ArrayList<>();
		for (Dept dept : depts) {
			if (!include.contains(dept.getId())) {
				continue;
			}
			// 父节点不在结果里 → 这是当前可见子树的根
			if (!StringUtils.hasText(dept.getParentId()) || !include.contains(dept.getParentId())
					|| ROOT_DEPT_PARENT_ID.equals(dept.getParentId())) {
				roots.add(toNode(dept, childMap, include, visible, manageable, counts, managerNames, roleIdsByDept));
			}
		}
		if (!StringUtils.hasText(keyword)) {
			return roots;
		}
		return filterByKeyword(roots, keyword.trim());
	}

	/**
	 * 新建班级：老师有 class:list 就能建（权限在 TeachingApi 上），这里只保证落库的是班级。
	 *
	 * <p>班级不绑角色：角色是用户组（教职工）的能力，班级里只有学员；create_by 由框架自动填当前用户，
	 * 班级树的可见范围据此判定，所以建完就能看到自己的班。
	 */
	@Override
	public void createClass(DeptRequest request) {
		if (request == null) {
			throw new ValidationException("缺少班级信息");
		}
		if (!StringUtils.hasText(request.getName())) {
			throw new ValidationException("请填写班级名称");
		}
		request.setDeptType(Dept.TYPE_CLASS);
		request.setRoleIds(null);
		String classKind = normalizeClassKind(request.getClassKind());
		request.setClassKind(classKind);
		assertRegisterAllowedForClassKind(classKind, request.getAllowRegister());
		if (Dept.CLASS_KIND_GROUP.equals(classKind)) {
			request.setAllowRegister(false);
		}
		deptService.addDept(request);
	}

	/**
	 * 修改班级：只允许改自己「可管理」的班（管理员 / class:grant / 班主任 / 可管理授权）。
	 *
	 * <p>只改名称、上级、有效期；类型固定 class，不允许通过更新把班级改成用户组。
	 */
	@Override
	public void updateClass(DeptRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少班级 id");
		}
		Dept current = assertClassManage(request.getId());
		request.setDeptType(Dept.TYPE_CLASS);
		request.setRoleIds(null);
		String classKind = request.getClassKind() == null ? classKindOf(current) : normalizeClassKind(request.getClassKind());
		request.setClassKind(classKind);
		// 只有「从关到开」才校验全局/权限；全局关闭期间已有班级保持开启不会被改名请求误拦
		boolean turningOnRegister = Boolean.TRUE.equals(request.getAllowRegister())
				&& !Boolean.TRUE.equals(current.getAllowRegister());
		assertRegisterAllowedForClassKind(classKind, turningOnRegister ? Boolean.TRUE : null);
		if (Dept.CLASS_KIND_GROUP.equals(classKind)) {
			request.setAllowRegister(false);
		}
		deptService.updateDept(request);
	}

	/** 对外暴露的写权限闸门：只做委托，规则全在 {@link #assertClassManage(String)} 里 */
	@Override
	public void assertManage(String deptId) {
		assertClassManage(deptId);
	}

	/** 对外暴露的「教学班」闸门：容器班不能收学员/开放注册/分配资源 */
	@Override
	public void assertTeaching(String deptId) {
		assertTeachingClass(deptId);
	}

	/** 对外暴露的读权限闸门：只做委托，规则全在 {@link #assertClassVisible(String)} 里 */
	@Override
	public void assertVisible(String deptId) {
		assertClassVisible(deptId);
	}

	@Override
	public List<ClassMemberView> listClassMembers(String deptId) {
		Dept dept = assertClassVisible(deptId);
		assertTeachingClass(deptId);
		List<User> users = userMapper.selectList(classStudentQuery(deptId).orderByDesc(User::getCreateAt));
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
		List<ClassMemberView> views = users.stream().map(user -> {
			ClassMemberView view = new ClassMemberView();
			view.setId(user.getId());
			view.setName(user.getName());
			view.setUsername(usernames.get(user.getId()));
			view.setStatus(user.getStatus());
			view.setDeptId(dept.getId());
			view.setDeptName(dept.getName());
			view.setPhone(user.getPhone());
			view.setEmail(user.getEmail());
			view.setCreateAt(user.getCreateAt());
			view.setRoleNames(roleNames.getOrDefault(user.getId(), Collections.emptyList()));
			return view;
		}).collect(Collectors.toList());
		fillClassAssignments(views);
		return views;
	}

	/**
	 * 未交卷名单（班级管理 → 答卷管理 / 查看数据）。
	 *
	 * <p>交卷口径只看 {@code t_answer.create_by}：名单是按「人」算的，一名学员可能换过班、走过兼报班的
	 * 专属链接、补考过多次，按 {@code t_answer.class_id} 过滤都会算错 —— 换班前的卷留在原班，从新班看
	 * 就被误判成没交；兼报班只有一份卷，按 class_id 也只会算到其中一个班。所以成员一侧取主组 + 兼报组，
	 * 答卷一侧只认人。
	 *
	 * <p>权限：班级可见（与成员名单同一道闸）+ 项目可读；只读接口，不做写校验。
	 */
	@Override
	public UnsubmittedStudentView listUnsubmittedStudents(String projectId, String deptId) {
		if (!StringUtils.hasText(projectId)) {
			throw new ValidationException("缺少项目 id");
		}
		if (!StringUtils.hasText(deptId)) {
			throw new ValidationException("缺少班级 id");
		}
		assertClassVisible(deptId);
		// 容器班不直接收学员，名单恒为空：按成员列表的口径直接拒绝，免得老师以为「全班都交了」
		assertTeachingClass(deptId);
		answerAccessGuard.assertProjectAccess(projectId);

		List<User> students = userMapper.selectList(classStudentQuery(deptId).orderByAsc(User::getName));
		UnsubmittedStudentView result = new UnsubmittedStudentView();
		result.setTotal(students.size());
		result.setSubmitted(0);
		result.setList(Collections.emptyList());
		if (students.isEmpty()) {
			return result;
		}

		// 只取 create_by 一列：答案正文可能有几百 KB，名单界面用不到。
		// 用 selectObjs 而不是 selectList：投影查询走实体映射时，MyBatis-Plus 会在「只选一列」的情况下
		// 把行映射成 null（线上实测 NPE），而这里要的本来就是列值，不是实体。
		List<Object> submittedValues = answerMapper.selectObjs(Wrappers.<Answer>lambdaQuery()
				.select(Answer::getCreateBy).isNotNull(Answer::getCreateBy)
				.eq(Answer::getProjectId, projectId)
				// 正式答卷才叫交卷：temp_save=0 是暂存草稿，不能算已交
				.eq(Answer::getTempSave, 1));
		Set<String> submittedUserIds = submittedValues == null ? Collections.emptySet()
				: submittedValues.stream().filter(Objects::nonNull).map(String::valueOf).collect(Collectors.toSet());

		List<UnsubmittedStudentView.Student> unsubmitted = new ArrayList<>();
		int submitted = 0;
		for (User student : students) {
			if (submittedUserIds.contains(student.getId())) {
				submitted += 1;
				continue;
			}
			UnsubmittedStudentView.Student row = new UnsubmittedStudentView.Student();
			row.setId(student.getId());
			row.setName(student.getName());
			row.setPhone(student.getPhone());
			unsubmitted.add(row);
		}
		result.setSubmitted(submitted);
		// 班级一般几十人：不分页；超过上限时给排在前面的 N 个，total / submitted 仍是全体口径
		result.setList(unsubmitted.size() > UNSUBMITTED_LIMIT
				? new ArrayList<>(unsubmitted.subList(0, UNSUBMITTED_LIMIT)) : unsubmitted);
		return result;
	}

	/**
	 * 班级成员口径：主组（t_user.dept_id）或兼报组（t_user_dept）里的学员。
	 *
	 * <p>成员名单与未交卷名单共用这一条：两边各写一份 JOIN 条件，早晚会漂移成两种口径。
	 */
	private LambdaQueryWrapper<User> classStudentQuery(String deptId) {
		return Wrappers.<User>lambdaQuery()
				// 班级成员只列学员；老师/管理员在「用户管理」里，不混进班级名单
				.eq(User::getUserType, "student")
				.and(w -> w.eq(User::getDeptId, deptId).or()
						.apply("EXISTS (SELECT 1 FROM t_user_dept ud WHERE ud.user_id = t_user.id AND ud.dept_id = {0} AND ud.is_deleted = 0)",
								deptId));
	}

	@Override
	public List<ClassMemberView> listPendingStudents() {
		List<Dept> depts = deptMapper.selectList(Wrappers.<Dept>lambdaQuery()
				.eq(Dept::getDeptType, Dept.TYPE_CLASS).eq(Dept::getClassKind, Dept.CLASS_KIND_TEACHING)
				.orderByAsc(Dept::getSortCode));
		Map<String, Dept> byId = depts.stream().filter(d -> StringUtils.hasText(d.getId()))
				.collect(Collectors.toMap(Dept::getId, d -> d, (a, b) -> a, LinkedHashMap::new));
		boolean seeAll = SecurityContextUtils.isAdmin()
				|| SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode());
		Set<String> visible = visibleDeptIds(depts, byId);
		if (!seeAll && visible.isEmpty()) {
			return Collections.emptyList();
		}
		LambdaQueryWrapper<User> query = Wrappers.<User>lambdaQuery()
				.eq(User::getUserType, "student")
				.eq(User::getStatus, AppConsts.USER_STATUS.INVALID)
				.orderByDesc(User::getCreateAt);
		// 老师只看自己可见班级里的待审核学员；管理员/class:grant 看全部（含历史上未分班的）
		if (!seeAll) {
			query.in(User::getDeptId, visible);
		}
		List<User> users = userMapper.selectList(query);
		if (users.isEmpty()) {
			return Collections.emptyList();
		}
		List<String> userIds = users.stream().map(User::getId).collect(Collectors.toList());
		Map<String, String> usernames = accountMapper
				.selectList(Wrappers.<Account>lambdaQuery().in(Account::getUserId, userIds)
						.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()))
				.stream().filter(a -> StringUtils.hasText(a.getUserId()))
				.collect(Collectors.toMap(Account::getUserId, Account::getAuthAccount, (a, b) -> a));
		// 状态以登录账号为准：t_user.status=0 但账号已被单独启用的，不算待审核
		Set<String> pendingAccountUserIds = accountMapper
				.selectList(Wrappers.<Account>lambdaQuery().in(Account::getUserId, userIds)
						.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name())
						.eq(Account::getStatus, AppConsts.USER_STATUS.INVALID))
				.stream().map(Account::getUserId).filter(StringUtils::hasText).collect(Collectors.toSet());
		Map<String, String> deptNames = depts.stream().filter(d -> StringUtils.hasText(d.getId()) && StringUtils.hasText(d.getName()))
				.collect(Collectors.toMap(Dept::getId, Dept::getName, (a, b) -> a));
		Map<String, List<String>> roleNames = loadRoleNames(userIds);
		List<ClassMemberView> views = users.stream().filter(user -> pendingAccountUserIds.contains(user.getId()))
				.map(user -> {
					ClassMemberView view = new ClassMemberView();
					view.setId(user.getId());
					view.setName(user.getName());
					view.setUsername(usernames.get(user.getId()));
					view.setStatus(user.getStatus());
					view.setDeptId(user.getDeptId());
					view.setDeptName(StringUtils.hasText(user.getDeptId()) ? deptNames.get(user.getDeptId()) : null);
					view.setPhone(user.getPhone());
					view.setEmail(user.getEmail());
					view.setCreateAt(user.getCreateAt());
					view.setRoleNames(roleNames.getOrDefault(user.getId(), Collections.emptyList()));
					return view;
				}).collect(Collectors.toList());
		fillClassAssignments(views);
		return views;
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#request.userId")
	public void approvePendingStudent(PendingStudentApproveRequest request) {
		if (request == null || !StringUtils.hasText(request.getUserId())) {
			throw new ValidationException("缺少待审核学员 id");
		}
		User user = userMapper.selectById(request.getUserId());
		if (user == null || !"student".equals(user.getUserType())) {
			throw new ValidationException("只能审核学员账号");
		}
		if (Objects.equals(user.getStatus(), AppConsts.USER_STATUS.VALID)) {
			throw new ValidationException("该学员已审核通过");
		}
		String targetDeptId = StringUtils.hasText(request.getDeptId()) ? request.getDeptId().trim() : user.getDeptId();
		if (!StringUtils.hasText(targetDeptId)) {
			throw new ValidationException("请先为学员选择班级");
		}
		Dept target = deptMapper.selectById(targetDeptId);
		if (target == null || !Dept.TYPE_CLASS.equals(target.getDeptType())) {
			throw new ValidationException("审核通过时只能分配到班级（class）");
		}
		if (!Dept.CLASS_KIND_TEACHING.equals(classKindOf(target))) {
			throw new ValidationException("审核通过时只能分配到教学班（teaching），不能是容器班");
		}
		if (!SecurityContextUtils.isAdmin() && !SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode())) {
			// 老师只能审核自己能管理的班；把学员改到别的班时，原班也必须在自己的管理范围内
			assertClassManage(targetDeptId);
			if (!Objects.equals(targetDeptId, user.getDeptId()) && StringUtils.hasText(user.getDeptId())) {
				assertClassManage(user.getDeptId());
			}
		}
		user.setDeptId(targetDeptId);
		user.setStatus(AppConsts.USER_STATUS.VALID);
		userMapper.updateById(user);

		Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery()
				.eq(Account::getUserId, user.getId()).eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()));
		if (account == null) {
			throw new ValidationException("该学员没有可用的登录账号，请联系管理员");
		}
		account.setStatus(AppConsts.USER_STATUS.VALID);
		accountMapper.updateById(account);
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#userId")
	public void rejectPendingStudent(String userId) {
		if (!StringUtils.hasText(userId)) {
			throw new ValidationException("缺少待审核学员 id");
		}
		User user = userMapper.selectById(userId);
		if (user == null || !"student".equals(user.getUserType())) {
			throw new ValidationException("只能拒绝学员账号");
		}
		if (Objects.equals(user.getStatus(), AppConsts.USER_STATUS.VALID)) {
			throw new ValidationException("该学员已审核通过，不能拒绝；请到班级成员里处理");
		}
		boolean seeAll = SecurityContextUtils.isAdmin()
				|| SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode());
		if (!seeAll) {
			if (!StringUtils.hasText(user.getDeptId())) {
				throw new AccessDeniedException("未分班的申请只有管理员可以拒绝");
			}
			assertClassManage(user.getDeptId());
		}
		// 删除待审核账号：手机号释放，学员可以重新注册；记录已由审计日志留痕
		userService.deleteClassStudent(userId);
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
			view.setAccessLevel(partner.getAccessLevel() == null ? ACCESS_READ_ONLY : partner.getAccessLevel());
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
				// 分配老师只列教职工，不把学员当成可授权的老师
				.eq(User::getUserType, "staff")
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
		if (request == null || !StringUtils.hasText(request.getDeptId())) {
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
		// accessLevel 不传时：新增按只读，已存在的保持原级别（避免老客户端把「可管理」降成只读）
		Integer requestedLevel = request.getAccessLevel();
		int accessLevel = requestedLevel == null ? ACCESS_READ_ONLY : normalizeAccessLevel(requestedLevel);
		Map<String, ClassPartner> granted = classPartnerMapper
				.selectList(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getDeptId, request.getDeptId())
						.in(ClassPartner::getUserId, userIds))
				.stream().filter(partner -> StringUtils.hasText(partner.getUserId()))
				.collect(Collectors.toMap(ClassPartner::getUserId, partner -> partner, (a, b) -> a));
		for (String userId : userIds) {
			ClassPartner exist = granted.get(userId);
			if (exist == null) {
				ClassPartner partner = new ClassPartner();
				partner.setDeptId(request.getDeptId());
				partner.setUserId(userId);
				partner.setAccessLevel(accessLevel);
				classPartnerMapper.insert(partner);
				continue;
			}
			// 已授权过的老师再次提交 = 改级别（upsert）：以前这里直接 continue，级别永远改不动。
			// 本次没显式传 accessLevel 时不动原级别，只补人。
			if (requestedLevel != null
					&& !Objects.equals(exist.getAccessLevel() == null ? ACCESS_READ_ONLY : exist.getAccessLevel(), accessLevel)) {
				ClassPartner update = new ClassPartner();
				update.setId(exist.getId());
				update.setAccessLevel(accessLevel);
				classPartnerMapper.updateById(update);
			}
		}
	}

	/**
	 * 修改某条授权的级别（1=只读 / 2=可管理）。
	 *
	 * <p>不在 {@code ClassService} 接口里：本次改动不允许动 {@code server/shared} 的接口文件，
	 * 由 {@code TeachingApi} 直接注入本实现类调用（与 {@code SystemProtectionApi} 注入
	 * {@code SystemServiceImpl} 同一写法）。
	 */
	@Override
	public void updateClassPartner(ClassPartnerRequest request) {
		if (request == null || !StringUtils.hasText(request.getDeptId()) || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少授权记录 id");
		}
		if (request.getAccessLevel() == null) {
			throw new ValidationException("请选择授权级别");
		}
		int accessLevel = normalizeAccessLevel(request.getAccessLevel());
		ClassPartner partner = classPartnerMapper.selectById(request.getId());
		// 必须属于这个班：否则可以拿 A 班的授权 id 去改 B 班，越权改掉别人的授权
		if (partner == null || !Objects.equals(partner.getDeptId(), request.getDeptId())) {
			throw new ValidationException("授权记录不存在，请刷新后重试");
		}
		ClassPartner update = new ClassPartner();
		update.setId(partner.getId());
		update.setAccessLevel(accessLevel);
		classPartnerMapper.updateById(update);
	}

	/** 授权级别只接受 1=只读 / 2=可管理；为空按只读处理 */
	private int normalizeAccessLevel(Integer accessLevel) {
		if (accessLevel == null) {
			return ACCESS_READ_ONLY;
		}
		if (accessLevel != ACCESS_READ_ONLY && accessLevel != ACCESS_MANAGE) {
			throw new ValidationException("授权级别只能是 1（只读）或 2（可管理）");
		}
		return accessLevel;
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
		// 写操作走「可管理」判定：只有查看权限（access_level=1）的老师不能加人；容器班也不能直接收人
		assertClassManage(request.getDeptId());
		assertTeachingClass(request.getDeptId());
		if (!StringUtils.hasText(request.getName())) {
			throw new ValidationException("请填写学员姓名");
		}
		// 学员的登录账号就是手机号：必填 + 格式校验；request.username 仅为兼容旧前端，一律忽略
		String phone = request.getPhone() == null ? null : request.getPhone().trim();
		if (!StringUtils.hasText(phone)) {
			throw new ValidationException("请填写手机号");
		}
		if (!ClassStudentService.PHONE_PATTERN.matcher(phone).matches()) {
			throw new ValidationException("手机号格式不正确");
		}
		if (!StringUtils.hasText(request.getPassword())) {
			throw new ValidationException("请填写初始密码");
		}
		if (userService.checkUsernameExist(phone)) {
			throw new ValidationException(ClassStudentService.PHONE_EXISTS_MESSAGE);
		}
		UserRequest userRequest = new UserRequest();
		userRequest.setName(request.getName().trim());
		userRequest.setUsername(phone);
		userRequest.setPassword(request.getPassword());
		userRequest.setPhone(phone);
		userRequest.setEmail(request.getEmail());
		userRequest.setDeptId(request.getDeptId());
		userRequest.setDeptIds(Collections.emptyList());
		try {
			userService.createClassStudent(userRequest);
		}
		catch (org.springframework.dao.DuplicateKeyException ex) {
			// 并发下 checkUsernameExist 可能漏掉，唯一键冲突统一给用户可读提示
			throw new ValidationException(ClassStudentService.PHONE_EXISTS_MESSAGE);
		}
	}

	@Override
	public void updateClassMember(ClassMemberUpdateRequest request) {
		if (request == null || !StringUtils.hasText(request.getDeptId()) || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少班级或学员 id");
		}
		assertClassManage(request.getDeptId());
		assertTeachingClass(request.getDeptId());
		User user = userMapper.selectById(request.getId());
		if (user == null || !"student".equals(user.getUserType())) {
			throw new ValidationException("只能编辑学员账号");
		}
		if (!isMemberOfClass(user, request.getDeptId())) {
			throw new AccessDeniedException("这个学员不在当前班级");
		}
		// 账号资料只在主班维护：兼报班的老师不能重置密码/改手机号，避免两个班互相覆盖
		if (!Objects.equals(user.getDeptId(), request.getDeptId())) {
			throw new AccessDeniedException("这个学员的主班不在当前班，只能到主班编辑资料");
		}
		if (!StringUtils.hasText(request.getName())) {
			throw new ValidationException("请填写学员姓名");
		}
		// 手机号是登录账号，编辑时同样必填：清空手机号等于把学员的登录名弄没
		String phone = request.getPhone() == null ? null : request.getPhone().trim();
		if (!StringUtils.hasText(phone)) {
			throw new ValidationException("请填写手机号");
		}
		if (!ClassStudentService.PHONE_PATTERN.matcher(phone).matches()) {
			throw new ValidationException("手机号格式不正确");
		}
		UserRequest update = new UserRequest();
		update.setId(user.getId());
		update.setName(request.getName().trim());
		update.setPhone(phone);
		update.setEmail(request.getEmail());
		update.setStatus(request.getStatus());
		update.setPassword(request.getPassword());
		userService.updateClassStudent(update);
	}

	@Override
	public void deleteClassMember(String deptId, String userId) {
		if (!StringUtils.hasText(deptId) || !StringUtils.hasText(userId)) {
			throw new ValidationException("缺少班级或学员 id");
		}
		assertClassManage(deptId);
		assertTeachingClass(deptId);
		User user = userMapper.selectById(userId);
		if (user == null || !"student".equals(user.getUserType())) {
			throw new ValidationException("只能删除学员账号");
		}
		if (!isMemberOfClass(user, deptId)) {
			throw new AccessDeniedException("这个学员不在当前班级");
		}
		// 删除账号只允许主班操作；兼报班只能“移出本班”，不能删账号
		if (!Objects.equals(user.getDeptId(), deptId)) {
			throw new ValidationException("这个学员的主班不在当前班，只能移出本班，不能删除账号");
		}
		userService.deleteClassStudent(userId);
	}

	/** 批量导入学员（见 {@link ClassStudentImportService}） */
	@Override
	public ClassMemberImportResult importClassMembers(ClassMemberImportRequest request) {
		if (request == null || !StringUtils.hasText(request.getDeptId())) {
			throw new ValidationException("缺少班级 id");
		}
		// 批量导入是写操作：先判「可管理」，再谈文件格式；容器班不能收人
		assertClassManage(request.getDeptId());
		assertTeachingClass(request.getDeptId());
		if (request.getFile() == null || request.getFile().isEmpty()) {
			throw new ValidationException("请选择要导入的 Excel 文件");
		}
		// 逐行校验与建号在 ClassStudentImportService；事务由本类的 @Transactional(rollbackFor = Exception.class) 开启，
		// 任一行失败整批回滚，异常信息统一是「第 N 行：原因」
		return classStudentImportService.importMembers(request.getDeptId(), request.getFile());
	}


	/** 给成员行补齐「主班 / 兼报班 / 已加入几个班 / 能否调班」，列表与待审核共用 */
	private void fillClassAssignments(List<ClassMemberView> views) {
		if (CollectionUtils.isEmpty(views)) {
			return;
		}
		List<String> userIds = views.stream().map(ClassMemberView::getId).filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
		Map<String, User> users = userMapper.selectBatchIds(userIds).stream().filter(Objects::nonNull)
				.collect(Collectors.toMap(User::getId, user -> user, (a, b) -> a));
		Map<String, List<String>> extrasByUser = userDeptMapper
				.selectList(Wrappers.<UserDept>lambdaQuery().in(UserDept::getUserId, userIds)).stream()
				.filter(binding -> StringUtils.hasText(binding.getUserId()) && StringUtils.hasText(binding.getDeptId()))
				.collect(Collectors.groupingBy(UserDept::getUserId,
						Collectors.mapping(UserDept::getDeptId, Collectors.toList())));
		Set<String> deptIds = new LinkedHashSet<>();
		users.values().forEach(user -> {
			if (StringUtils.hasText(user.getDeptId())) {
				deptIds.add(user.getDeptId());
			}
		});
		extrasByUser.values().forEach(deptIds::addAll);
		Map<String, Dept> depts = deptIds.isEmpty() ? Collections.emptyMap()
				: deptMapper.selectBatchIds(deptIds).stream().filter(Objects::nonNull)
						.collect(Collectors.toMap(Dept::getId, dept -> dept, (a, b) -> a));
		boolean assignPermission = SecurityContextUtils.isAdmin()
				|| SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_MEMBER_ASSIGN.getCode());
		for (ClassMemberView view : views) {
			User user = users.get(view.getId());
			String primaryId = user == null ? null : user.getDeptId();
			List<String> extras = extrasByUser.getOrDefault(view.getId(), Collections.emptyList()).stream()
					.filter(deptId -> !Objects.equals(deptId, primaryId)).distinct().collect(Collectors.toList());
			view.setPrimaryDeptId(primaryId);
			view.setPrimaryDeptName(primaryId == null || depts.get(primaryId) == null ? null
					: depts.get(primaryId).getName());
			view.setExtraDeptIds(extras);
			view.setExtraDeptNames(extras.stream()
					.map(deptId -> depts.get(deptId) == null ? deptId : depts.get(deptId).getName())
					.collect(Collectors.toList()));
			view.setPrimary(Objects.equals(view.getDeptId(), primaryId));
			view.setClassCount((StringUtils.hasText(primaryId) ? 1 : 0) + extras.size());
			Dept primaryDept = primaryId == null ? null : depts.get(primaryId);
			boolean manageable = primaryDept != null ? canManageDept(primaryDept)
					: (SecurityContextUtils.isAdmin()
							|| SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode()));
			view.setCanAssign(assignPermission && manageable);
		}
	}


	@Override
	@CacheEvict(cacheNames = "userCache", key = "#userId")
	public void removeExtraClassMember(String deptId, String userId) {
		if (!StringUtils.hasText(deptId) || !StringUtils.hasText(userId)) {
			throw new ValidationException("缺少班级或学员 id");
		}
		assertClassManage(deptId);
		assertTeachingClass(deptId);
		User user = userMapper.selectById(userId);
		if (user == null || !"student".equals(user.getUserType())) {
			throw new ValidationException("只能操作学员账号");
		}
		if (Objects.equals(user.getDeptId(), deptId)) {
			throw new ValidationException("这是学员的主班，不能移出；请先调整主班或删除账号");
		}
		int removed = userDeptMapper.delete(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getUserId, userId)
				.eq(UserDept::getDeptId, deptId));
		if (removed == 0) {
			throw new ValidationException("这个学员不在当前班级");
		}
	}

	@Override
	public List<ClassMemberView> listMemberCandidates(String targetDeptId, String sourceDeptId, String keyword) {
		if (!StringUtils.hasText(targetDeptId) || !StringUtils.hasText(sourceDeptId)) {
			throw new ValidationException("请选择来源班级");
		}
		if (Objects.equals(targetDeptId, sourceDeptId)) {
			return Collections.emptyList();
		}
		assertClassManage(targetDeptId);
		assertTeachingClass(targetDeptId);
		assertClassVisible(sourceDeptId);
		assertTeachingClass(sourceDeptId);
		Set<String> targetUserIds = listClassMembers(targetDeptId).stream().map(ClassMemberView::getId)
				.filter(StringUtils::hasText).collect(Collectors.toSet());
		String kw = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
		return listClassMembers(sourceDeptId).stream()
				.filter(member -> member.getStatus() != null && member.getStatus() == AppConsts.USER_STATUS.VALID)
				.filter(member -> !targetUserIds.contains(member.getId()))
				.filter(member -> kw.isEmpty()
						|| (member.getName() != null && member.getName().toLowerCase(Locale.ROOT).contains(kw))
						|| (member.getPhone() != null && member.getPhone().contains(kw))
						|| (member.getUsername() != null && member.getUsername().contains(kw)))
				.limit(200).collect(Collectors.toList());
	}

	@Override
	@CacheEvict(cacheNames = "userCache", allEntries = true)
	public AddExistingStudentsResult addExistingStudents(AddExistingStudentsRequest request) {
		if (request == null || !StringUtils.hasText(request.getDeptId())
				|| !StringUtils.hasText(request.getSourceDeptId())) {
			throw new ValidationException("缺少目标班级或来源班级");
		}
		assertClassManage(request.getDeptId());
		assertTeachingClass(request.getDeptId());
		assertClassVisible(request.getSourceDeptId());
		assertTeachingClass(request.getSourceDeptId());
		AddExistingStudentsResult result = new AddExistingStudentsResult();
		if (CollectionUtils.isEmpty(request.getUserIds())) {
			return result;
		}
		for (String userId : request.getUserIds().stream().filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList())) {
			User user = userMapper.selectById(userId);
			AddExistingStudentsResult.Skip skip = new AddExistingStudentsResult.Skip();
			skip.setUserId(userId);
			skip.setName(user == null ? null : user.getName());
			if (user == null || !"student".equals(user.getUserType())) {
				skip.setReason("学员不存在");
				result.getSkipped().add(skip);
				continue;
			}
			if (!Objects.equals(user.getStatus(), AppConsts.USER_STATUS.VALID)) {
				skip.setReason("账号还在待审核或已停用");
				result.getSkipped().add(skip);
				continue;
			}
			if (!isMemberOfClass(user, request.getSourceDeptId())) {
				skip.setReason("不在来源班级");
				result.getSkipped().add(skip);
				continue;
			}
			if (isMemberOfClass(user, request.getDeptId())) {
				skip.setReason("已经在当前班级");
				result.getSkipped().add(skip);
				continue;
			}
			long extraCount = userDeptMapper.selectCount(Wrappers.<UserDept>lambdaQuery()
					.eq(UserDept::getUserId, user.getId()).ne(UserDept::getDeptId, user.getDeptId()));
			long classCount = (StringUtils.hasText(user.getDeptId()) ? 1 : 0) + extraCount;
			if (classCount >= 3) {
				skip.setReason("已加入 3 个班，达到上限");
				result.getSkipped().add(skip);
				continue;
			}
			try {
				UserDept binding = new UserDept();
				binding.setUserId(user.getId());
				binding.setDeptId(request.getDeptId());
				userDeptMapper.insert(binding);
				result.setAdded(result.getAdded() + 1);
			}
			catch (org.springframework.dao.DuplicateKeyException ex) {
				skip.setReason("已经在当前班级");
				result.getSkipped().add(skip);
			}
		}
		return result;
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#request.userId")
	public void assignStudentClasses(StudentClassAssignRequest request) {
		if (request == null || !StringUtils.hasText(request.getUserId())
				|| !StringUtils.hasText(request.getPrimaryDeptId())) {
			throw new ValidationException("请选择学员和主班");
		}
		User user = userMapper.selectById(request.getUserId());
		if (user == null || !"student".equals(user.getUserType())) {
			throw new ValidationException("只能调整学员账号");
		}
		Dept primary = assertTeachingClass(request.getPrimaryDeptId().trim());
		List<String> extras = request.getExtraDeptIds() == null ? Collections.emptyList()
				: request.getExtraDeptIds().stream().filter(StringUtils::hasText).map(String::trim)
						.filter(deptId -> !Objects.equals(deptId, primary.getId())).distinct()
						.collect(Collectors.toList());
		if (extras.size() > 2) {
			throw new ValidationException("兼报班最多 2 个，加上主班一共最多 3 个班");
		}
		for (String deptId : extras) {
			assertTeachingClass(deptId);
		}
		boolean seeAll = SecurityContextUtils.isAdmin()
				|| SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode());
		if (!seeAll) {
			// 班主任只能操作自己可管理的班：目标主班、原主班、目标兼报、要移除的旧兼报都要可管理
			assertClassManage(primary.getId());
			if (StringUtils.hasText(user.getDeptId())) {
				assertClassManage(user.getDeptId());
			}
			for (String deptId : extras) {
				assertClassManage(deptId);
			}
			for (String oldExtra : userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery()
					.eq(UserDept::getUserId, user.getId())).stream().map(UserDept::getDeptId).filter(StringUtils::hasText)
					.collect(Collectors.toList())) {
				if (!extras.contains(oldExtra) && !Objects.equals(oldExtra, user.getDeptId())) {
					assertClassManage(oldExtra);
				}
			}
		}
		User update = new User();
		update.setId(user.getId());
		update.setDeptId(primary.getId());
		userMapper.updateById(update);
		userDeptMembershipService.saveUserDepts(user.getId(), primary.getId(), extras);
	}

	private boolean isMemberOfClass(User user, String deptId) {
		if (user == null) {
			return false;
		}
		if (Objects.equals(user.getDeptId(), deptId)) {
			return true;
		}
		return userDeptMapper.selectCount(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getUserId, user.getId())
				.eq(UserDept::getDeptId, deptId)) > 0;
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
		return expandDescendants(roots, depts);
	}

	/**
	 * 当前用户能「管理」的班级：自己创建/负责的班 + 被授了 access_level=2 的班，并向下覆盖所有下级班。
	 *
	 * <p>与 {@link #assertClassManage(String)} 同一套口径（那里是单班向上查祖先，这里是一棵树向下展开），
	 * 树上的 {@code manageable} 字段就来自这个集合。
	 */
	private Set<String> manageableDeptIds(List<Dept> depts, Map<String, Dept> byId) {
		if (SecurityContextUtils.isAdmin() || SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode())) {
			return depts.stream().map(Dept::getId).filter(StringUtils::hasText)
					.collect(Collectors.toCollection(LinkedHashSet::new));
		}
		String currentUserId = SecurityContextUtils.getUserId();
		if (!StringUtils.hasText(currentUserId)) {
			return Collections.emptySet();
		}
		Set<String> roots = new LinkedHashSet<>();
		for (Dept dept : depts) {
			if (Objects.equals(currentUserId, dept.getCreateBy()) || Objects.equals(currentUserId, dept.getManagerId())) {
				roots.add(dept.getId());
			}
		}
		classPartnerMapper
				.selectList(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getUserId, currentUserId)
						.eq(ClassPartner::getAccessLevel, ACCESS_MANAGE))
				.forEach(partner -> {
					if (StringUtils.hasText(partner.getDeptId()) && byId.containsKey(partner.getDeptId())) {
						roots.add(partner.getDeptId());
					}
				});
		if (roots.isEmpty()) {
			return Collections.emptySet();
		}
		return expandDescendants(roots, depts);
	}

	/** 从 roots 出发沿 parent_id 向下展开（授权/负责一个班包含它的全部下级班） */
	private Set<String> expandDescendants(Set<String> roots, List<Dept> depts) {
		Map<String, List<Dept>> childMap = depts.stream()
				.filter(d -> StringUtils.hasText(d.getParentId()))
				.collect(Collectors.groupingBy(Dept::getParentId));
		Set<String> result = new LinkedHashSet<>(roots);
		Deque<String> queue = new ArrayDeque<>(roots);
		while (!queue.isEmpty()) {
			String parent = queue.poll();
			for (Dept child : childMap.getOrDefault(parent, Collections.emptyList())) {
				if (result.add(child.getId())) {
					queue.add(child.getId());
				}
			}
		}
		return result;
	}

	/**
	 * 补上祖先节点，保证被授权的班在树里有路径可显示。
	 *
	 * <p>祖先必须是本次查到的真实节点：根组被软删（is_deleted=1）时，
	 * 子组的 parent_id 仍指向它；如果把这个幽灵祖先加进 include，所有子组都会被判成
	 * 「父节点存在」而永远进不了 roots，整棵树就是空的。
	 */
	private Set<String> withAncestors(Set<String> visible, Map<String, Dept> byId) {
		Set<String> include = new LinkedHashSet<>(visible);
		for (String id : visible) {
			Dept current = byId.get(id);
			int depth = 0;
			while (current != null && StringUtils.hasText(current.getParentId())
					&& !ROOT_DEPT_PARENT_ID.equals(current.getParentId()) && depth++ < 64) {
				String parentId = current.getParentId();
				if (!byId.containsKey(parentId) || !include.add(parentId)) {
					break;
				}
				current = byId.get(parentId);
			}
		}
		return include;
	}

	private ClassNodeView toNode(Dept dept, Map<String, List<Dept>> childMap, Set<String> include,
			Set<String> visible, Set<String> manageable, Map<String, Long> counts, Map<String, String> managerNames,
			Map<String, List<String>> roleIdsByDept) {
		ClassNodeView view = new ClassNodeView();
		view.setId(dept.getId());
		view.setName(dept.getName());
		view.setParentId(dept.getParentId());
		view.setManagerId(dept.getManagerId());
		view.setMemberCount(counts.getOrDefault(dept.getId(), 0L));
		view.setAccessible(visible.contains(dept.getId()));
		view.setManageable(manageable.contains(dept.getId()));
		view.setRoleIds(roleIdsByDept.getOrDefault(dept.getId(), Collections.emptyList()));
		view.setClassKind(classKindOf(dept));
		view.setAllowRegister(Boolean.TRUE.equals(dept.getAllowRegister()));
		view.setValidFrom(dept.getValidFrom());
		view.setValidTo(dept.getValidTo());
		if (StringUtils.hasText(dept.getManagerId())) {
			view.setManagerName(managerNames.computeIfAbsent(dept.getManagerId(), userId -> {
				User user = userMapper.selectById(userId);
				return user == null ? null : user.getName();
			}));
		}
		view.setChildren(childMap.getOrDefault(dept.getId(), Collections.emptyList()).stream()
				.filter(child -> include.contains(child.getId()))
				.map(child -> toNode(child, childMap, include, visible, manageable, counts, managerNames, roleIdsByDept))
				.collect(Collectors.toList()));
		return view;
	}

	/** 一次取出本页所有组的角色绑定，避免每个节点查一次 */
	private Map<String, List<String>> loadDeptRoleIds(Set<String> deptIds) {
		if (deptIds.isEmpty()) {
			return Collections.emptyMap();
		}
		return deptRoleMapper.selectList(Wrappers.<DeptRole>lambdaQuery().in(DeptRole::getDeptId, deptIds)).stream()
				.filter(role -> StringUtils.hasText(role.getDeptId()) && StringUtils.hasText(role.getRoleId()))
				.collect(Collectors.groupingBy(DeptRole::getDeptId,
						Collectors.mapping(DeptRole::getRoleId, Collectors.toList())));
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
		userMapper.selectList(Wrappers.<User>lambdaQuery().select(User::getDeptId)
				.eq(User::getUserType, "student").in(User::getDeptId, deptIds))
				.forEach(user -> counts.merge(user.getDeptId(), 1L, Long::sum));
		List<UserDept> extras = userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery()
				.in(UserDept::getDeptId, deptIds));
		if (!extras.isEmpty()) {
			Set<String> extraUserIds = extras.stream().map(UserDept::getUserId).filter(StringUtils::hasText)
					.collect(Collectors.toSet());
			Map<String, String> userTypes = extraUserIds.isEmpty() ? Collections.emptyMap()
					: userMapper.selectBatchIds(extraUserIds).stream().filter(Objects::nonNull)
							.collect(Collectors.toMap(User::getId, User::getUserType, (a, b) -> a));
			extras.stream().filter(userDept -> "student".equals(userTypes.get(userDept.getUserId())))
					.forEach(userDept -> counts.merge(userDept.getDeptId(), 1L, Long::sum));
		}
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
		assertDeptIsClass(dept);
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

	/**
	 * 判断当前用户能否修改这个班（增删改学员、批量导入）。比查看多一档：
	 * <ul>
	 * <li>管理员 / class:grant：全部班级；</li>
	 * <li>本班或任一祖先班由自己创建（create_by）/负责（manager_id）；</li>
	 * <li>本班或任一祖先班上有 access_level=2（可管理）的授权。</li>
	 * </ul>
	 * 只读授权（access_level=1）能看能打开，但写操作会在这里被挡下。
	 * @return 班级实体，供调用方复用
	 */
	public Dept assertClassManage(String deptId) {
		if (!StringUtils.hasText(deptId)) {
			throw new ValidationException("缺少班级 id");
		}
		Dept dept = deptMapper.selectById(deptId);
		if (dept == null) {
			throw new ValidationException("班级不存在");
		}
		assertDeptIsClass(dept);
		if (canManageDept(dept)) {
			return dept;
		}
		throw new AccessDeniedException(MANAGE_DENIED_MESSAGE);
	}

	/** class_kind：空/非法值按容器班；新建时前端不传则默认教学班 */
	private String normalizeClassKind(String value) {
		return Dept.CLASS_KIND_GROUP.equalsIgnoreCase(value) ? Dept.CLASS_KIND_GROUP : Dept.CLASS_KIND_TEACHING;
	}

	private String classKindOf(Dept dept) {
		return dept != null && Dept.CLASS_KIND_TEACHING.equals(dept.getClassKind()) ? Dept.CLASS_KIND_TEACHING
				: Dept.CLASS_KIND_GROUP;
	}

	/** 教学班闸门：容器班只做层级，不能直接收学员/开放注册/分资源 */
	private Dept assertTeachingClass(String deptId) {
		Dept dept = deptMapper.selectById(deptId);
		if (dept == null) {
			throw new ValidationException("班级不存在");
		}
		assertDeptIsClass(dept);
		if (!Dept.CLASS_KIND_TEACHING.equals(classKindOf(dept))) {
			throw new ValidationException("这是容器班，只做层级；请选择下级教学班");
		}
		return dept;
	}

	/**
	 * 开放注册只允许教学班，并且受全局总闸与 class:register 权限约束。
	 * 关闭注册（false）不拦，避免老师想关却关不掉。
	 */
	private void assertRegisterAllowedForClassKind(String classKind, Boolean allowRegister) {
		if (!Boolean.TRUE.equals(allowRegister)) {
			return;
		}
		if (!Dept.CLASS_KIND_TEACHING.equals(classKind)) {
			throw new ValidationException("容器班不能开放注册，请选择教学班");
		}
		if (!SecurityContextUtils.isAdmin() && !SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_REGISTER.getCode())) {
			throw new AccessDeniedException("没有开放班级注册的权限");
		}
		SystemInfo.RegisterInfo registerInfo = systemService.getSystemInfo().getRegisterInfo();
		if (registerInfo != null && Boolean.FALSE.equals(registerInfo.getRegisterEnabled())) {
			throw new ValidationException("管理员未开启全局注册，暂时不能开放班级注册");
		}
	}

	/** 只有 dept_type=class 的节点才是班级；用户组（org）不能走班级的读写接口 */
	private void assertDeptIsClass(Dept dept) {
		if (!Dept.TYPE_CLASS.equals(dept.getDeptType())) {
			throw new ValidationException("该用户组不是班级");
		}
	}

	private boolean canManageDept(Dept dept) {
		if (SecurityContextUtils.isAdmin() || SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode())) {
			return true;
		}
		String currentUserId = SecurityContextUtils.getUserId();
		if (!StringUtils.hasText(currentUserId)) {
			return false;
		}
		List<String> chain = ancestorChain(dept.getId());
		for (String id : chain) {
			Dept current = Objects.equals(id, dept.getId()) ? dept : deptMapper.selectById(id);
			if (current != null && (Objects.equals(currentUserId, current.getCreateBy())
					|| Objects.equals(currentUserId, current.getManagerId()))) {
				return true;
			}
		}
		return classPartnerMapper
				.selectCount(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getUserId, currentUserId)
						.eq(ClassPartner::getAccessLevel, ACCESS_MANAGE).in(ClassPartner::getDeptId, chain)) > 0;
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
