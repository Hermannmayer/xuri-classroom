package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.DeptRole;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.mapper.DeptRoleMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;











@Component
@RequiredArgsConstructor
public class UserPermissionGuard {


	private static final String SYSTEM_AUTHORITY_PREFIX = "system:";

	private final RoleServiceImpl roleService;

	private final DeptRoleMapper deptRoleMapper;

	private final UserAuthService userAuthService;

	private final UserDeptMembershipService deptService;

	public void assertManageableUser(String userId) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		Set<String> callerAuthorities = currentAuthorityNames();
		if (!callerAuthorities.containsAll(loadAuthorityNames(userId))) {
			throw new AccessDeniedException("不能管理权限高于当前用户的账号（含用户组继承来的权限）");
		}
	}

	/** 「把用户放进某个组」会连带把该组（含祖先链）绑定的角色授予他，因此非管理员改 deptId / deptIds 时， */
	public void assertDeptAssignmentAllowed(String mainDeptId, List<String> extraDeptIds) {
		if (!SecurityContextUtils.isAuthenticated() || SecurityContextUtils.isAdmin()) {
			return;
		}
		List<String> roots = deptService.mergeDeptIds(mainDeptId, extraDeptIds);
		if (CollectionUtils.isEmpty(roots)) {
			return;
		}
		List<String> chain = deptService.resolveDeptChainIds(roots, deptService.loadDeptMap());
		if (CollectionUtils.isEmpty(chain)) {
			return;
		}
		List<String> roleIds = deptRoleMapper
				.selectList(Wrappers.<DeptRole>lambdaQuery().in(DeptRole::getDeptId, chain)).stream()
				.map(DeptRole::getRoleId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		if (roleIds.isEmpty()) {
			return;
		}
		Set<String> callerAuthorities = currentAuthorityNames();
		for (Role role : roleService.listByIds(roleIds)) {
			if (role == null || !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID)) {
				continue;
			}
			Set<String> roleAuthorities = userAuthService.toAuthorityNames(role);
			if (roleAuthorities.contains(AppConsts.ROLE_ADMIN)
					|| !callerAuthorities.containsAll(roleAuthorities)) {
				throw new AccessDeniedException("不能把用户放进该用户组：它（或其上级组）绑定的角色「"
						+ role.getName() + "」权限高于当前用户");
			}
		}
	}

	public void assertGrantableRoles(List<String> roleIds) {
		if (roleIds == null) {
			return;
		}
		List<String> normalizedIds = roleIds.stream().filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
		List<Role> roles = normalizedIds.isEmpty() ? Collections.emptyList() : roleService.listByIds(normalizedIds);
		if (roles.size() != normalizedIds.size()
				|| roles.stream().anyMatch(role -> !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID))) {
			throw new AccessDeniedException("不能分配不存在或已停用的角色");
		}
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		Set<String> callerAuthorities = currentAuthorityNames();
		for (Role role : roles) {
			Set<String> roleAuthorities = userAuthService.toAuthorityNames(role);
			if (roleAuthorities.contains(AppConsts.ROLE_ADMIN) || !callerAuthorities.containsAll(roleAuthorities)) {
				throw new AccessDeniedException("不能分配权限高于当前用户的角色");
			}
		}
	}

	/** 「建用户按角色分权」的服务层二次校验 */
	public void assertRoleGrantScope(List<String> roleIds) {
		if (CollectionUtils.isEmpty(roleIds)) {
			return;
		}
		List<String> normalizedIds = roleIds.stream().filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
		if (normalizedIds.isEmpty() || SecurityContextUtils.isAdmin()) {
			return;
		}




		boolean assignsSystemRole = roleService.listByIds(normalizedIds).stream().filter(Objects::nonNull).anyMatch(role -> {
			if ("admin".equals(role.getCode()) || "teacher".equals(role.getCode())) {
				return true;
			}
			return userAuthService.toAuthorityNames(role).stream().anyMatch(authority -> authority.startsWith(SYSTEM_AUTHORITY_PREFIX));
		});
		Set<String> callerAuthorities = currentAuthorityNames();
		if (assignsSystemRole) {
			if (!callerAuthorities.contains(PermissionEnum.SYSTEM_USER_CREATE_TEACHER.getCode())) {
				throw new ErrorCodeException(ErrorCode.PermVerifyFailed,
						"没有权限创建/修改为带系统管理权限的角色（需要 system:user:create:teacher）");
			}
			return;
		}
		if (!callerAuthorities.contains(PermissionEnum.SYSTEM_USER_CREATE_STUDENT.getCode())
				&& !callerAuthorities.contains(PermissionEnum.SYSTEM_USER_CREATE.getCode())) {
			throw new ErrorCodeException(ErrorCode.PermVerifyFailed,
					"没有权限创建/分配学员角色（需要 system:user:create:student 或 system:user:create）");
		}
	}

	/** 目标用户的有效权限：直挂角色 ∪ 组链绑定角色（与 loadUserById 同一套口径） */
	public Set<String> loadAuthorityNames(String userId) {
		UserInfo userInfo = userAuthService.buildUserInfo(userId);
		if (userInfo == null || userInfo.getAuthorityList() == null) {
			return Collections.emptySet();
		}
		return new HashSet<>(userInfo.getAuthorityList());
	}

	public Set<String> currentAuthorityNames() {
		return SecurityContextUtils.getUser().getAuthorities().stream().map(GrantedAuthority::getAuthority)
				.collect(Collectors.toSet());
	}

}
