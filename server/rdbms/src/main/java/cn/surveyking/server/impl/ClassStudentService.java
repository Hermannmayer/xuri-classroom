package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.security.PasswordEncoder;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.UserRequest;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.DeptRole;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserRole;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.DeptRoleMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.mapper.UserRoleMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import javax.validation.ValidationException;
import java.util.*;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 班级学员：班主任视角的建号 / 改号 / 删号。
 *
 * <p>
 * 从 {@code UserServiceImpl} 切出的班级块。入口权限由 {@code class:member:*} 控制，
 * 这里只做「只碰学员账号、不改角色与组」的兜底校验；建号复用
 * {@link UserAdminService#createUser(UserRequest, boolean)}（不校验组绑定角色，由
 * {@code assertClassDeptRoleSafe} 单独把关）。
 */
@Component
@RequiredArgsConstructor
public class ClassStudentService {

	private final UserMapper userMapper;

	private final AccountMapper accountMapper;

	private final UserDeptMapper userDeptMapper;

	private final UserRoleMapper userRoleMapper;

	private final DeptRoleMapper deptRoleMapper;

	private final RoleServiceImpl roleService;

	private final PasswordEncoder passwordEncoder;

	private final UserDeptMembershipService deptService;

	private final UserAdminService userAdminService;

	private final UserAuthService userAuthService;

	/**
	 * 班级管理里由班主任新增学员：角色固定成系统内置学员角色，不接受请求方指定角色。
	 *
	 * <p>不走 {@link #assertRoleGrantScope}：老师没有学员的 portal:student / repo:practice 等权限串，
	 * 但这不代表不能在自己班里建学员；入口由 class:member:create 控制，班级可见性由 ClassService 校验。
	 */
	public void createClassStudent(UserRequest request) {
		userAdminService.validateStrongPassword(request.getPassword(), null);
		Role studentRole = roleService
				.list(Wrappers.<Role>lambdaQuery().in(Role::getCode, "student", "xueyuan")
						.eq(Role::getStatus, AppConsts.USER_STATUS.VALID).orderByAsc(Role::getCreateAt))
				.stream().findFirst()
				.orElseThrow(() -> new ValidationException("系统里没有可用的学员角色，请联系管理员"));
		request.setRoles(Collections.singletonList(studentRole.getId()));
		request.setStatus(AppConsts.USER_STATUS.VALID);
		request.setUserType("student");
		assertClassDeptRoleSafe(request.getDeptId(), studentRole);
		userAdminService.createUser(request, false);
	}

	/**
	 * 班级管理里删除学员：调用方（ClassService）已经校验过班级可见性与「目标是学员」，
	 * 这里不再走 system:user:delete 的 manage 校验，但仍然清账号、附加组与角色绑定。
	 */
	public void deleteClassStudent(String userId) {
		User user = userMapper.selectById(userId);
		if (user == null || !"student".equals(user.getUserType())) {
			throw new AccessDeniedException("只能删除学员账号");
		}
		userMapper.deleteById(userId);
		accountMapper.physicallyDeleteExternalByUserId(userId);
		accountMapper.delete(Wrappers.<Account>lambdaQuery().eq(Account::getUserId, userId));
		userDeptMapper.deleteByUserId(userId);
		userRoleMapper.delete(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, userId));
		userAdminService.evictUserAfterCommit(userId);
	}

	/**
	 * 班级管理里编辑学员：只允许改姓名、手机、邮箱、状态与重置密码；
	 * 不允许改角色/所属组（防提权），也不走 system:user:update 的 manage 校验。
	 */
	public void updateClassStudent(UserRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少学员 id");
		}
		User current = userMapper.selectById(request.getId());
		if (current == null || !"student".equals(current.getUserType())) {
			throw new AccessDeniedException("只能编辑学员账号");
		}
		User update = new User();
		update.setId(request.getId());
		update.setName(request.getName());
		update.setPhone(request.getPhone());
		update.setEmail(request.getEmail());
		update.setStatus(request.getStatus());
		userMapper.updateById(update);
		if (request.getStatus() != null || isNotBlank(request.getPassword())) {
			Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery()
					.eq(Account::getUserId, request.getId()).eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()));
			if (account != null) {
				if (request.getStatus() != null) {
					account.setStatus(request.getStatus());
				}
				if (isNotBlank(request.getPassword())) {
					userAdminService.validateStrongPassword(request.getPassword(), null);
					account.setAuthSecret(passwordEncoder.encode(request.getPassword()));
				}
				accountMapper.updateById(account);
			}
		}
		userAdminService.evictUserAfterCommit(request.getId());
	}

	/**
	 * 班级建学员时不能跳过「组绑定角色」的风险：把用户放进某个组会连带继承该组（含祖先链）的角色。
	 *
	 * <p>这里不允许目标组链绑定任何高于「学员角色」的角色；学员角色本身或权限是它子集的角色放行。
	 * 这样班主任能往普通班级加学员，但不能借班级配置提权。
	 */
	private void assertClassDeptRoleSafe(String deptId, Role studentRole) {
		if (SecurityContextUtils.isAdmin() || !StringUtils.hasText(deptId)) {
			return;
		}
		List<String> chain = deptService.resolveDeptChainIds(Collections.singletonList(deptId), deptService.loadDeptMap());
		if (CollectionUtils.isEmpty(chain)) {
			return;
		}
		List<String> roleIds = deptRoleMapper
				.selectList(Wrappers.<DeptRole>lambdaQuery().in(DeptRole::getDeptId, chain)).stream()
				.map(DeptRole::getRoleId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		if (roleIds.isEmpty()) {
			return;
		}
		Set<String> studentAuthorities = userAuthService.toAuthorityNames(studentRole);
		for (Role role : roleService.listByIds(roleIds)) {
			if (role == null || !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID)) {
				continue;
			}
			if (Objects.equals(role.getCode(), "student") || Objects.equals(role.getCode(), "xueyuan")) {
				continue;
			}
			if (!studentAuthorities.containsAll(userAuthService.toAuthorityNames(role))) {
				throw new AccessDeniedException("不能把学员放进绑定了更高权限角色的用户组");
			}
		}
	}

}
