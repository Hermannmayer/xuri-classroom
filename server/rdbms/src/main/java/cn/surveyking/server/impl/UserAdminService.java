package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.security.PasswordEncoder;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.UserProfileRequest;
import cn.surveyking.server.domain.dto.UserRequest;
import cn.surveyking.server.domain.mapper.UserPositionDtoMapper;
import cn.surveyking.server.domain.mapper.UserViewMapper;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserPosition;
import cn.surveyking.server.domain.model.UserRole;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.mapper.UserPositionMapper;
import cn.surveyking.server.mapper.UserRoleMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import javax.validation.ValidationException;
import java.util.*;
import java.util.regex.Pattern;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 用户写操作：建号、改号、删号、岗位与界面偏好。
 *
 * <p>
 * 从 {@code UserServiceImpl} 切出的管理块。缓存注解（{@code @CacheEvict}）仍然留在
 * {@code UserServiceImpl} 的入口方法上，事务也由该类上的 {@code @Transactional} 统一开启，
 * 组件只负责搬运过来的方法体。
 *
 * <p>
 * {@code evictUserAfterCommit} 原样搬到这里（含 afterCommit 注册方式），班级学员的删除/编辑
 * 也复用它，避免两处各写一份事务同步逻辑。
 */
@Component
@RequiredArgsConstructor
public class UserAdminService {

	private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile("^.{8,32}$");

	private final UserMapper userMapper;

	private final DeptMapper deptMapper;

	private final AccountMapper accountMapper;

	private final UserViewMapper userViewMapper;

	private final UserRoleMapper userRoleMapper;

	private final UserDeptMapper userDeptMapper;

	private final UserPositionMapper userPositionMapper;

	private final UserPositionDtoMapper userPositionDtoMapper;

	private final PasswordEncoder passwordEncoder;

	private final CacheManager cacheManager;

	private final UserDeptMembershipService deptService;

	private final UserPermissionGuard permissionGuard;

	private final UserAuthService userAuthService;

	public void createUser(UserRequest request) {
		createUser(request, true);
	}

	/**
	 * @param assertDeptRoles 是否校验「目标组绑定的角色自己能授予」。班级管理里老师给本班加学员时，
	 *                        目标是系统内置学员角色，不需要也不应该要求老师拥有学员的全部权限串。
	 */
	public void createUser(UserRequest request, boolean assertDeptRoles) {
		// 内部入口没显式指定时按学员处理；用户管理（createSystemUser）会显式设 staff
		if (!StringUtils.hasText(request.getUserType())) {
			request.setUserType("student");
		}
		// 用户组（org）放教职工、班级（class）放学员：类型错位会让学员继承教职工角色，必须挡住
		assertUserDeptTypes(request.getUserType(), request.getDeptId(), request.getDeptIds());
		// 把用户放进某个组会连带获得该组（含祖先链）绑定的角色：非管理员必须先确认这些角色他能授予
		if (assertDeptRoles) {
			permissionGuard.assertDeptAssignmentAllowed(request.getDeptId(), request.getDeptIds());
		}
		User user = userViewMapper.fromRequest(request);
		userMapper.insert(user);

		// 创建登录账号
		Account account = userViewMapper.toAccount(request);
		account.setAuthType(AppConsts.AUTH_TYPE.PWD.name());
		account.setUserType(AppConsts.USER_TYPE.SysUser.toString());
		account.setAuthSecret(passwordEncoder.encode(request.getPassword()));
		account.setUserId(user.getId());
		account.setStatus(request.getStatus());
		accountMapper.insert(account);

		// 添加用户角色
		request.setId(user.getId());
		addUserRoles(request);
		// 添加用户岗位
		addUserPositions(request);
		// 添加附加组（主组已经在 t_user.dept_id 里）
		deptService.saveUserDepts(user.getId(), user.getDeptId(), request.getDeptIds());
	}

	/**
	 * 教职工只能加入用户组（dept_type=org），学员只能加入班级（dept_type=class）。
	 *
	 * <p>组类型决定成员继承哪些角色：把学员放进用户组会顺带拿到教职工角色，把 staff 放进班级又会
	 * 污染班级成员列表（班级成员接口只查 student）。历史数据里 dept_type 为空按 org 处理。
	 *
	 * @param userType staff / student；为空表示这次不涉及用户类型，跳过校验
	 * @param deptId 主组
	 * @param deptIds 附加组
	 */
	private void assertUserDeptTypes(String userType, String deptId, List<String> deptIds) {
		if (!StringUtils.hasText(userType)) {
			return;
		}
		boolean student = "student".equals(userType);
		Set<String> targetDeptIds = new LinkedHashSet<>();
		if (StringUtils.hasText(deptId)) {
			targetDeptIds.add(deptId.trim());
		}
		if (!CollectionUtils.isEmpty(deptIds)) {
			deptIds.stream().filter(StringUtils::hasText).map(String::trim).forEach(targetDeptIds::add);
		}
		if (targetDeptIds.isEmpty()) {
			return;
		}
		String expected = student ? Dept.TYPE_CLASS : Dept.TYPE_ORG;
		String message = student ? "学员只能加入班级（class）" : "教职工只能加入用户组（org）";
		for (Dept dept : deptMapper.selectBatchIds(targetDeptIds)) {
			if (dept == null) {
				continue;
			}
			String actual = Dept.TYPE_CLASS.equals(dept.getDeptType()) ? Dept.TYPE_CLASS : Dept.TYPE_ORG;
			if (!expected.equals(actual)) {
				throw new ValidationException(message);
			}
		}
	}

	public void createSystemUser(UserRequest request) {
		validateStrongPassword(request.getPassword(), null);
		request.setUserType("staff");
		permissionGuard.assertGrantableRoles(request.getRoles());
		// 入口注解只认 system:user:create（能不能建用户），这里再按角色分「学员档 / 老师档」
		permissionGuard.assertRoleGrantScope(request.getRoles());
		createUser(request);
	}

	private void addUserRoles(UserRequest request) {
		if (!CollectionUtils.isEmpty(request.getRoles())) {
			request.getRoles().forEach(roleId -> {
				UserRole userRole = new UserRole();
				userRole.setUserId(request.getId());
				userRole.setRoleId(roleId);
				userRole.setUserType(AppConsts.USER_TYPE.SysUser.name());
				userRoleMapper.insert(userRole);
			});
		}
	}

	private void addUserPositions(UserRequest request) {
		if (!CollectionUtils.isEmpty(request.getUserPositions())) {
			request.getUserPositions().forEach(userPositionRequest -> {
				UserPosition userPosition = userPositionDtoMapper.fromRequest(userPositionRequest);
				userPosition.setUserId(request.getId());
				userPositionMapper.insert(userPosition);
			});
		}
	}

	public void updateUser(UserRequest request) {
		if (request.getId() == null) {
			return;
		}
		permissionGuard.assertManageableUser(request.getId());
		permissionGuard.assertGrantableRoles(request.getRoles());
		// 改角色和建用户同档：把学员改成老师也是「授予 system:* 角色」，必须持 teacher 档权限
		permissionGuard.assertRoleGrantScope(request.getRoles());
		User current = userMapper.selectById(request.getId());
		// 改组同样守住「用户组放教职工、班级放学员」：没传的字段沿用用户现有值
		assertUserDeptTypes(
				StringUtils.hasText(request.getUserType()) ? request.getUserType()
						: current == null ? null : current.getUserType(),
				request.getDeptId() != null ? request.getDeptId() : current == null ? null : current.getDeptId(),
				request.getDeptIds() != null ? request.getDeptIds() : deptService.listExtraDeptIds(request.getId()));
		// 组变更同样会改变「有效权限」：目标组链上绑定的角色必须都是自己能授予的，否则等于借改组提权
		permissionGuard.assertDeptAssignmentAllowed(request.getDeptId() != null ? request.getDeptId() : current == null ? null : current.getDeptId(),
				request.getDeptIds() != null ? request.getDeptIds() : deptService.listExtraDeptIds(request.getId()));
		if (isNotBlank(request.getPassword())) {
			validateStrongPassword(request.getPassword(), null);
		}
		User user = userViewMapper.fromRequest(request);
		userMapper.updateById(user);

		if (request.getStatus() != null || isNotBlank(request.getPassword())) {
			// 更新登录账号
			Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery()
					.eq(Account::getUserId, request.getId()).eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()));
			if (isNotBlank(request.getPassword()) && Objects.equals(request.getId(), SecurityContextUtils.getUserId())
					&& !SecurityContextUtils.isAdmin() && isBlank(request.getOldPassword())) {
				throw new InternalServerError(userAuthService.i18n("user.password.invalid"));
			}
			if (isNotBlank(request.getPassword()) && isNotBlank(request.getOldPassword())) {
				if (!passwordEncoder.matches(request.getOldPassword(), account.getAuthSecret())) {
					throw new InternalServerError(userAuthService.i18n("user.password.invalid"));
				}
			}
			if (request.getUsername() != null) {
				account.setAuthAccount(request.getUsername());
			}
			if (request.getStatus() != null) {
				account.setStatus(request.getStatus());
			}
			if (isNotBlank(request.getPassword())) {
				account.setAuthSecret(passwordEncoder.encode(request.getPassword()));
			}
			accountMapper.updateById(account);
		}

		// 更新用户角色
		if (request.getRoles() != null) {
			userRoleMapper.delete(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, request.getId()));
			addUserRoles(request);
		}
		// 更新用户岗位
		if (request.getUserPositions() != null) {
			userPositionMapper
					.delete(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getUserId, request.getId()));
			addUserPositions(request);
		}
		// 更新附加组（deptIds 为 null 表示本次不改；空数组表示只保留主组）
		if (request.getDeptIds() != null) {
			String mainDeptId = request.getDeptId();
			if (!StringUtils.hasText(mainDeptId)) {
				mainDeptId = current == null ? null : current.getDeptId();
			}
			deptService.saveUserDepts(request.getId(), mainDeptId, request.getDeptIds());
		}
		evictUserAfterCommit(request.getId());
	}

	public void updateUserProfile(String userId, UserProfileRequest request) {
		if (userId == null) {
			throw new AccessDeniedException("未登录用户不能修改个人资料");
		}
		User user = new User();
		user.setId(userId);
		user.setName(request.getName());
		user.setAvatar(request.getAvatar());
		user.setProfile(request.getProfile());
		user.setPhone(request.getPhone());
		user.setEmail(request.getEmail());
		user.setGender(request.getGender());
		user.setCorrectTimes(request.getCorrectTimes());
		userMapper.updateById(user);

		if (isNotBlank(request.getPassword())) {
			validateStrongPassword(request.getPassword(), null);
			if (isBlank(request.getOldPassword())) {
				throw new InternalServerError(userAuthService.i18n("user.password.invalid"));
			}
			Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery().eq(Account::getUserId, userId)
					.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()));
			if (account == null || !passwordEncoder.matches(request.getOldPassword(), account.getAuthSecret())) {
				throw new InternalServerError(userAuthService.i18n("user.password.invalid"));
			}
			account.setAuthSecret(passwordEncoder.encode(request.getPassword()));
			accountMapper.updateById(account);
		}
		evictUserAfterCommit(userId);
	}

	public void updateUiZoom(UserRequest request) {
		if (request == null || request.getUiZoom() == null) {
			return;
		}
		// 只允许 0.9 / 1 / 1.15 / 1.3 四个档位：越界值夹到区间内，
		// 避免有人手工把 ui_zoom 改成 10 倍把界面撑爆
		double zoom;
		try {
			zoom = Double.parseDouble(String.valueOf(request.getUiZoom()));
		}
		catch (NumberFormatException ex) {
			return;
		}
		if (zoom < 0.9) {
			zoom = 0.9;
		}
		if (zoom > 1.3) {
			zoom = 1.3;
		}
		User update = new User();
		update.setId(SecurityContextUtils.getUserId());
		update.setUiZoom(String.valueOf(zoom));
		userMapper.updateById(update);
		// currentUser 走 userCache，改完必须清掉，否则刷新还是旧档位
		evictUserAfterCommit(SecurityContextUtils.getUserId());
	}

	public void updateUiTheme(UserRequest request) {
		if (request == null || request.getUiTheme() == null) {
			return;
		}
		// 白名单：只接受 light / dark，其它值忽略，避免脏数据影响全站主题
		String theme = "light".equals(request.getUiTheme()) ? "light" : "dark";
		User update = new User();
		update.setId(SecurityContextUtils.getUserId());
		update.setUiTheme(theme);
		userMapper.updateById(update);
		evictUserAfterCommit(SecurityContextUtils.getUserId());
	}

	public void deleteUser(String id) {
		permissionGuard.assertManageableUser(id);
		userMapper.deleteById(id);
		accountMapper.physicallyDeleteExternalByUserId(id);
		accountMapper.delete(Wrappers.<Account>lambdaQuery().eq(Account::getUserId, id));
		// 用户没了，附加组/角色绑定也一起清掉
		userDeptMapper.deleteByUserId(id);
		userRoleMapper.delete(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, id));
		evictUserAfterCommit(id);
	}

	public void updateUserPosition(UserRequest request) {
		userPositionMapper
				.delete(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getPositionId, request.getId()));
		if (!CollectionUtils.isEmpty(request.getUserPositions())) {
			request.getUserPositions().forEach(userPositionRequest -> {
				UserPosition position = userPositionDtoMapper.fromRequest(userPositionRequest);
				position.setUserId(request.getId());
				userPositionMapper.insert(position);
			});
		}
	}

	public void validateStrongPassword(String password, Integer rowNum) {
		if (password != null && STRONG_PASSWORD_PATTERN.matcher(password).matches()) {
			return;
		}
		if (rowNum != null) {
			throw new InternalServerError(userAuthService.i18n("user.import.passwordWeak", rowNum));
		}
		throw new InternalServerError(userAuthService.i18n("user.password.strong"));
	}

	public void evictUserAfterCommit(String userId) {
		Cache userCache = cacheManager.getCache(CacheConsts.userCacheName);
		if (userCache == null || userId == null) {
			return;
		}
		Runnable evict = () -> userCache.evictIfPresent(userId);
		if (TransactionSynchronizationManager.isActualTransactionActive()
				&& TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					evict.run();
				}
			});
		}
		else {
			evict.run();
		}
	}

}
