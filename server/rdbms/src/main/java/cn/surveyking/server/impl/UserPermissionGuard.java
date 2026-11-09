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

/**
 * 用户域的权限断言：能管谁、能授哪些角色、能放进哪些组。
 *
 * <p>
 * 从 {@code UserServiceImpl} 切出的守卫块。{@code assertDeptAssignmentAllowed} 原本按职责更贴近部门域，
 * 但它要复用 {@code toAuthorityNames} / {@code currentAuthorityNames}；放在部门域会让
 * {@code UserAuthService → 部门域 → 权限断言 → UserAuthService} 形成循环，所以和另外两个断言放在一起。
 * {@code toAuthorityNames} 则留在 {@link UserAuthService}（构造 UserInfo 的权限集合也要用），
 * 依赖方向固定为「断言 → 认证 → 部门域」，无环。
 */
@Component
@RequiredArgsConstructor
public class UserPermissionGuard {

	/** 后台系统管理权限前缀：带这类权限的角色属于「老师/职工」档，只能由持 system:user:create:teacher 的人授予 */
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

	/**
	 * 「把用户放进某个组」会连带把该组（含祖先链）绑定的角色授予他，因此非管理员改 deptId / deptIds 时，
	 * 必须确认目标组链上绑定的角色自己都能授予——否则光有 system:user:update 就能把人塞进绑了
	 * admin/teacher 的组，等于绕开 assertGrantableRoles 发角色。
	 *
	 * <p>
	 * 两条豁免：① 管理员；② 匿名调用（注册）：那条路径的组与角色都来自系统设置，不由请求方指定。
	 * 孤儿绑定（角色已被删）不授予任何权限，直接跳过，避免脏数据阻断正常的用户管理。
	 */
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

	/**
	 * 「建用户按角色分权」的服务层二次校验。
	 *
	 * <p>
	 * 入口上的 @PreAuthorize 只回答「能不能进入建/改用户这个动作」，同一个人可能只该建学员、
	 * 不该建老师；这个区分只能看请求里的 roles，所以在服务层拦：
	 * <ul>
	 * <li>目标角色里<b>任一</b>权限串以 {@code system:} 开头（即能进系统管理）→ 调用方必须是管理员，
	 * 或持有 {@code system:user:create:teacher}；</li>
	 * <li>否则（纯学员类角色，不含任何 system:*）→ 调用方持有
	 * {@code system:user:create:student} 或 {@code system:user:create} 即可。</li>
	 * </ul>
	 *
	 * <p>
	 * 与 {@link #assertGrantableRoles} 分工：那个管「不能授予比自己高的角色」，这个管「学员/老师两档
	 * 委派」，两者都过才允许写库。角色 id 不存在/已停用由 assertGrantableRoles 先拦，这里只做分档。
	 * {@code roleIds} 为 null 表示本次不改角色（更新场景），直接跳过。
	 */
	public void assertRoleGrantScope(List<String> roleIds) {
		if (CollectionUtils.isEmpty(roleIds)) {
			return;
		}
		List<String> normalizedIds = roleIds.stream().filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
		if (normalizedIds.isEmpty() || SecurityContextUtils.isAdmin()) {
			return;
		}
		// 有效权限与 toAuthorityNames 同口径：code=admin 的角色会被注入全部权限目录，天然落进 system: 档。
		// 另外把 code=teacher 显式算作「老师档」：老师角色没有 system:* 权限（进不了系统管理），
		// 但能管考试/题库，属于高权角色，只有 system:user:create:teacher 的人才能授予，
		// 否则只有 create:student 的人也能把学员改成老师，等于越权提权。
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

	/**
	 * 目标用户的有效权限：直挂角色 ∪ 组链绑定角色（与 loadUserById 同一套口径）。
	 *
	 * <p>
	 * 只查 t_user_role 会把「没有任何直挂角色、但所在组绑了 teacher」的老师误判成低权限，
	 * 从而允许别人重置他的密码/删除他（账号接管）。这里直接用 loadUserById 的并集结果。
	 * 注意：内部自调用不走缓存代理，拿到的一定是实时结果。
	 */
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
