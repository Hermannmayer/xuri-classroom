package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.SystemService;
import cn.surveyking.server.service.UserService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.validation.ValidationException;
import java.util.*;
import java.util.stream.Collectors;





















@Service
@Transactional
@RequiredArgsConstructor
public class UserServiceImpl extends BaseService<UserMapper, User> implements UserService {

	private final AccountMapper accountMapper;

	private final DeptMapper deptMapper;

	private final RoleServiceImpl roleService;

	private final SystemService systemService;

	private final UserAuthService userAuthService;

	private final UserAdminService userAdminService;

	private final UserImportService userImportService;

	private final ClassStudentService classStudentService;

	private final UserQueryService userQueryService;

	@Override
	public UserInfo loadUserByUsername(String username) throws UsernameNotFoundException {
		return userAuthService.loadUserByUsername(username);
	}

	@Override
	@Cacheable(cacheNames = "userCache", key = "#p0", condition = "#p0!=null", unless = "#result == null")
	public UserInfo loadUserById(String userId) {
		return userAuthService.buildUserInfo(userId);
	}

	@Override
	public PaginationResponse<UserView> getUsers(UserQuery query) {
		return userQueryService.getUsers(query);
	}

	@Override
	public void createUser(UserRequest request) {
		userAdminService.createUser(request);
	}

	@Override
	public void createSystemUser(UserRequest request) {
		userAdminService.createSystemUser(request);
	}

	@Override
	public void createClassStudent(UserRequest request) {
		classStudentService.createClassStudent(request);
	}

	@Override
	public List<UserOptionView> listUserOptions(String keyword, String userType) {
		return userQueryService.listUserOptions(keyword, userType);
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#request.id")
	public void updateUser(UserRequest request) {
		userAdminService.updateUser(request);
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#userId")
	public void updateUserProfile(String userId, UserProfileRequest request) {
		userAdminService.updateUserProfile(userId, request);
	}

	@Override
	public void updateUiZoom(UserRequest request) {
		userAdminService.updateUiZoom(request);
	}

	@Override
	public void updateUiTheme(UserRequest request) {
		userAdminService.updateUiTheme(request);
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#id")
	public void deleteUser(String id) {
		userAdminService.deleteUser(id);
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#userId")
	public void deleteClassStudent(String userId) {
		classStudentService.deleteClassStudent(userId);
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#request.id")
	public void updateClassStudent(UserRequest request) {
		classStudentService.updateClassStudent(request);
	}

	@Override
	public boolean checkUsernameExist(String username) {
		return userAuthService.checkUsernameExist(username);
	}

	@Override
	public void updateUserPosition(UserRequest request) {
		userAdminService.updateUserPosition(request);
	}

	@Override
	public Set<String> getUserGroups(String userId) {
		return userQueryService.getUserGroups(userId);
	}

	@Override
	public Set<String> getUsersByGroup(String groupId, String currentUser) {
		return userQueryService.getUsersByGroup(groupId, currentUser);
	}

	@Override
	public List<UserInfo> selectUsers(SelectUserRequest request) {
		return userQueryService.selectUsers(request);
	}

	@Override
	public void register(RegisterRequest request) {
		SystemInfo systemInfo = systemService.getSystemInfo();
		SystemInfo.RegisterInfo registerInfo = systemInfo.getRegisterInfo();
		if (registerInfo == null) {
			registerInfo = new SystemInfo.RegisterInfo();
			registerInfo.setRegisterEnabled(true);
		}
		if (Boolean.FALSE.equals(registerInfo.getRegisterEnabled())) {
			throw new ErrorCodeException(ErrorCode.RegisterError);
		}

		String phone = StringUtils.hasText(request.getPhone()) ? request.getPhone().trim()
				: StringUtils.hasText(request.getUsername()) ? request.getUsername().trim() : "";
		if (!ClassStudentService.PHONE_PATTERN.matcher(phone).matches()) {
			throw new ValidationException("请输入正确的 11 位手机号");
		}
		String name = StringUtils.hasText(request.getName()) ? request.getName().trim() : "";
		if (name.isEmpty()) {
			throw new ValidationException("请输入姓名");
		}
		userAdminService.validateStrongPassword(request.getPassword(), null);

		long total = accountMapper
				.selectCount(Wrappers.<Account>lambdaQuery().eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name())
						.eq(Account::getAuthAccount, phone));
		if (total > 0) {
			throw new ErrorCodeException(ErrorCode.UsernameExists);
		}
		UserRequest createUserRequest = new UserRequest();
		createUserRequest.setUsername(phone);
		createUserRequest.setPassword(request.getPassword());
		createUserRequest.setName(name);
		createUserRequest.setPhone(phone);


		String registerDeptId = StringUtils.hasText(request.getDeptId()) ? request.getDeptId().trim() : null;
		Dept registerDept = registerDeptId == null ? null : deptMapper.selectById(registerDeptId);
		if (registerDept == null || !Dept.TYPE_CLASS.equals(registerDept.getDeptType())) {
			throw new ValidationException("请选择要注册的班级");
		}
		if (!Dept.CLASS_KIND_TEACHING.equals(registerDept.getClassKind())) {
			throw new ValidationException("只能注册到教学班，请重新选择");
		}
		if (!Boolean.TRUE.equals(registerDept.getAllowRegister())) {
			throw new ValidationException("该班级未开放注册，请重新选择");
		}
		createUserRequest.setDeptId(registerDept.getId());

		createUserRequest.setStatus(0);
		createUserRequest.setUserType("student");


		List<String> registerRoles = registerInfo.getRoles() == null ? Collections.emptyList()
				: registerInfo.getRoles().stream().filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		if (registerRoles.isEmpty()) {
			roleService.list(Wrappers.<Role>lambdaQuery().in(Role::getCode, "student", "xueyuan")
					.eq(Role::getStatus, AppConsts.USER_STATUS.VALID).orderByAsc(Role::getCreateAt)).stream().findFirst()
					.ifPresent(role -> createUserRequest.setRoles(Collections.singletonList(role.getId())));
		}
		else {
			createUserRequest.setRoles(registerRoles);
		}
		createUser(createUserRequest);
	}

	@Override
	public List<RegisterClassView> getRegisterClasses() {
		return getRegisterOptions().getClasses();
	}

	@Override
	public RegisterOptionsView getRegisterOptions() {
		RegisterOptionsView options = new RegisterOptionsView();
		SystemInfo.RegisterInfo registerInfo = systemService.getSystemInfo().getRegisterInfo();
		boolean globalEnabled = registerInfo == null || !Boolean.FALSE.equals(registerInfo.getRegisterEnabled());
		options.setGlobalEnabled(globalEnabled);
		List<RegisterClassView> classes = globalEnabled ? loadOpenRegisterClasses() : Collections.emptyList();
		options.setClasses(classes);
		options.setEnabled(globalEnabled && !classes.isEmpty());
		if (!globalEnabled) {
			options.setReason("GLOBAL_OFF");
		}
		else if (classes.isEmpty()) {
			options.setReason("NO_CLASS_OPEN");
		}
		return options;
	}

	private List<RegisterClassView> loadOpenRegisterClasses() {
		List<Dept> classes = deptMapper.selectList(Wrappers.<Dept>lambdaQuery()
				.eq(Dept::getDeptType, Dept.TYPE_CLASS).eq(Dept::getClassKind, Dept.CLASS_KIND_TEACHING)
				.eq(Dept::getAllowRegister, true)
				.orderByAsc(Dept::getSortCode).orderByAsc(Dept::getCreateAt));
		if (classes.isEmpty()) {
			return Collections.emptyList();
		}
		Map<String, Dept> byId = deptMapper.selectList(null).stream().filter(dept -> StringUtils.hasText(dept.getId()))
				.collect(Collectors.toMap(Dept::getId, dept -> dept, (a, b) -> a));
		return classes.stream().map(dept -> {
			RegisterClassView view = new RegisterClassView();
			view.setId(dept.getId());
			view.setName(dept.getName());
			view.setPath(buildDeptPath(dept, byId));
			return view;
		}).sorted(Comparator.comparing(RegisterClassView::getPath, Comparator.nullsLast(String::compareTo)))
				.collect(Collectors.toList());
	}

	/** 组织树路径（只用于注册页下拉展示，避免多级班级同名时分不清） */
	private String buildDeptPath(Dept dept, Map<String, Dept> byId) {
		Deque<String> names = new ArrayDeque<>();
		Dept cursor = dept;
		int depth = 0;
		while (cursor != null && depth++ < 32) {
			if (StringUtils.hasText(cursor.getName())) {
				names.addFirst(cursor.getName());
			}
			cursor = byId.get(cursor.getParentId());
		}
		return String.join(" / ", names);
	}

	@Override
	public List<RegisterRoleView> getRegisterRoles() {
		SystemInfo.RegisterInfo registerInfo = systemService.getSystemInfo().getRegisterInfo();
		List<String> defaultRegisterRoleCodes = registerInfo == null || registerInfo.getRoles() == null
				? Collections.emptyList() : registerInfo.getRoles();
		if (!defaultRegisterRoleCodes.isEmpty()) {
			return roleService.listByIds(defaultRegisterRoleCodes).stream()
					.map(role -> {
						RegisterRoleView roleView = new RegisterRoleView();
						roleView.setId(role.getId());
						roleView.setName(role.getName());
						return roleView;
					}).collect(Collectors.toList());
		}
		return new ArrayList<>();
	}

	@Override
	public UserOverview getUserOverviewData() {
		return userQueryService.getUserOverviewData();
	}

	@Override
	public void importUser(UserRequest request) {
		userImportService.importUser(request);
	}

	@Override
	public PaginationResponse<MyTaskView> queryTask(MyTaskQuery query) {
		return userQueryService.queryTask(query);
	}

	@Override
	public void validateCaptcha(AuthRequest request) {
		userAuthService.validateCaptcha(request);
	}

	@Override
	public PaginationResponse<MyTaskView> queryHistoryTask(MyTaskQuery query) {
		return userQueryService.queryHistoryTask(query);
	}

}
