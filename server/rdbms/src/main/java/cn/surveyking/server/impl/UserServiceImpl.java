package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.Dept;
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

import java.util.*;
import java.util.stream.Collectors;

/**
 * 用户服务入口：只保留接口方法、缓存注解与注册流程，方法体按职责拆到 impl 包下的组件。
 *
 * <p>
 * 拆分口径（2026-11 重构）：
 * <ul>
 * <li>{@link UserAuthService}：登录、{@code UserInfo} 组装、验证码、i18n；</li>
 * <li>{@link UserPermissionGuard}：能管谁 / 能授哪些角色 / 能放进哪些组；</li>
 * <li>{@link UserDeptMembershipService}：主组 + 附加组 + 祖先链、按组的数据范围；</li>
 * <li>{@link UserAdminService}：建号/改号/删号/岗位/界面偏好 + 事务提交后清缓存；</li>
 * <li>{@link UserImportService}：Excel 批量导入；</li>
 * <li>{@link ClassStudentService}：班级学员的增删改；</li>
 * <li>{@link UserQueryService}：列表、候选项、分组、我的任务。</li>
 * </ul>
 *
 * <p>
 * 这里刻意保留全部 {@code @Cacheable} / {@code @CacheEvict} 注解：缓存切面仍然挂在同一个
 * 入口 bean 上，key 与注解时机和拆分前完全一致。组件本身没有事务注解，
 * 仍由本类上的 {@code @Transactional} 开启事务，跨 bean 调用参与同一个事务。
 */
@Service
@Transactional
@RequiredArgsConstructor
public class UserServiceImpl extends BaseService<UserMapper, User> implements UserService {

	private static final String ROOT_DEPT_PARENT_ID = "0";

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
	public List<UserOptionView> listUserOptions(String keyword) {
		return userQueryService.listUserOptions(keyword);
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
		if (registerInfo == null || !Boolean.TRUE.equals(registerInfo.getRegisterEnabled())) {
			throw new ErrorCodeException(ErrorCode.RegisterError);
		}
		userAdminService.validateStrongPassword(request.getPassword(), null);

		long total = accountMapper
				.selectCount(Wrappers.<Account>lambdaQuery().eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name())
						.eq(Account::getAuthAccount, request.getUsername()));
		if (total > 0) {
			throw new ErrorCodeException(ErrorCode.UsernameExists);
		}
		UserRequest createUserRequest = new UserRequest();
		createUserRequest.setUsername(request.getUsername());
		createUserRequest.setPassword(request.getPassword());
		createUserRequest.setName(request.getName());
		createUserRequest.setPhone(request.getPhone());
		String registerDeptId = registerInfo.getDeptId() != null && !registerInfo.getDeptId().isEmpty()
				? registerInfo.getDeptId()
				: getRootDeptId();
		createUserRequest.setDeptId(registerDeptId);
		// 注册用户先进待审核状态（status=0），管理员在班级管理里启用后才能登录
		createUserRequest.setStatus(0);
		createUserRequest.setUserType("student");
		// 注册只能是学员；老师/管理员只能由后台分配
		String role = null;
		if (role != null) {
			if (!registerInfo.getRoles().contains(role)) {
				throw new ErrorCodeException(ErrorCode.RegisterError);
			}
			createUserRequest.setRoles(Collections.singletonList(request.getRole()));
		}
		else if (registerInfo.getRoles().size() > 0) {
			createUserRequest.setRoles(registerInfo.getRoles());
		}
		createUser(createUserRequest);
	}

	@Override
	public List<RegisterRoleView> getRegisterRoles() {
		List<String> defaultRegisterRoleCodes = systemService.getSystemInfo().getRegisterInfo().getRoles();
		if (defaultRegisterRoleCodes.size() > 0) {
			return roleService.listByIds(systemService.getSystemInfo().getRegisterInfo().getRoles()).stream()
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

	private String getRootDeptId() {
		return deptMapper
				.selectList(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, ROOT_DEPT_PARENT_ID)
						.orderByAsc(Dept::getSortCode).orderByAsc(Dept::getCreateAt))
				.stream().findFirst().map(Dept::getId)
				.orElseThrow(() -> new InternalServerError(userAuthService.i18n("user.register.rootDeptNotFound")));
	}

}
