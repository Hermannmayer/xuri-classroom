package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.domain.dto.AuthRequest;
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.mapper.UserViewMapper;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.DeptRole;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserRole;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.DeptRoleMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.mapper.UserRoleMapper;
import cn.surveyking.server.service.SystemService;
import com.anji.captcha.model.common.ResponseModel;
import com.anji.captcha.model.vo.CaptchaVO;
import com.anji.captcha.service.CaptchaService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import javax.validation.ValidationException;
import java.util.*;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 用户认证侧：账号密码登录、{@code UserInfo} 组装（角色/组链/界面偏好）与验证码校验。
 *
 * <p>
 * 从 {@code UserServiceImpl} 切出的第一块。{@code buildUserInfo} 就是原来的
 * {@code loadUserById} 方法体：缓存注解 {@code @Cacheable} 仍然留在 {@code UserServiceImpl#loadUserById}
 * 上（外部入口不变），而需要「实时结果」的内部调用方直接调 {@code buildUserInfo}，
 * 与原来「自调用不走缓存代理」的行为完全一致。
 */
@Component
@RequiredArgsConstructor
public class UserAuthService {

	private final AccountMapper accountMapper;

	private final UserMapper userMapper;

	private final UserViewMapper userViewMapper;

	private final UserRoleMapper userRoleMapper;

	private final DeptRoleMapper deptRoleMapper;

	private final RoleServiceImpl roleService;

	private final MessageSource messageSource;

	private final SystemService systemService;

	private final CaptchaService captchaService;

	private final UserDeptMembershipService deptService;

	/**
	 * @param username 账号密码登录认证使用
	 * @return
	 * @throws UsernameNotFoundException
	 */
	public UserInfo loadUserByUsername(String username) throws UsernameNotFoundException {
		LambdaQueryWrapper<Account> queryWrapper = Wrappers.<Account>lambdaQuery()
				.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()).eq(Account::getAuthAccount, username);
		Account existAccount = accountMapper.selectOne(queryWrapper);
		if (existAccount == null) {
			throw new UsernameNotFoundException(i18n("user.service.notFound", username));
		}
		if (existAccount.getStatus() != AppConsts.USER_STATUS.VALID) {
			throw new AccessDeniedException(i18n("user.service.disabled", username));
		}
		// 用户组有效期：过期后不允许登录（匿名答题走公开链接，不受此限）
		deptService.assertDeptValid(existAccount.getUserId());

		return userViewMapper.toUserView(existAccount);
	}

	public UserInfo buildUserInfo(String userId) {
		User user = userMapper.selectById(userId);
		if (user == null) {
			return null;
		}
		UserInfo userInfo = userViewMapper.toUserInfo(user);
		// 界面偏好（缩放 / 主题）用显式 SQL 读，实体映射在不同列类型下不可靠
		java.util.Map<String, Object> prefs = userMapper.selectUiPrefs(userId);
		if (prefs != null) {
			Object zoom = prefs.get("uiZoom");
			Object theme = prefs.get("uiTheme");
			userInfo.setUiZoom(zoom == null ? null : String.valueOf(zoom));
			userInfo.setUiTheme(theme == null ? null : String.valueOf(theme));
		}
		// 一人多组：主组 + 附加组，各自沿祖先链展开（组表整表取一次，避免逐层查库）
		List<String> extraDeptIds = deptService.listExtraDeptIds(user.getId());
		Map<String, Dept> deptMap = deptService.loadDeptMap();
		List<String> deptChainIds = deptService.resolveDeptChainIds(deptService.mergeDeptIds(user.getDeptId(), extraDeptIds), deptMap);

		// 最终权限 = 用户直挂角色 ∪ 所属组（主组 + 附加组，含祖先链）绑定的角色 ∪ ROLE_* 标记。
		// 超级管理员靠 ROLE_admin 放行，这里照常把它的角色标记并进来，不做任何裁剪。
		Set<String> authorities = resolveUserAuthorities(user.getId(), deptChainIds);
		userInfo.setAuthorities(authorities.stream()
				.map(authority -> (GrantedAuthority) () -> authority).collect(Collectors.toSet()));

		// 设置用户部门（deptName 仍然是主组名）
		if (StringUtils.hasText(user.getDeptId())) {
			Dept dept = deptMap.get(user.getDeptId());
			if (dept != null) {
				userInfo.setDeptName(dept.getName());
			}
		}
		userInfo.setDeptIds(extraDeptIds);
		userInfo.setDeptNames(extraDeptIds.stream().map(deptId -> deptService.deptNameOf(deptMap, deptId))
				.collect(Collectors.toList()));

		return userInfo;
	}

	/**
	 * 最终权限集合：t_user_role（直挂角色）∪ t_dept_role（组链上绑定的角色）。
	 *
	 * <p>
	 * 只查两次关联表：一次 user_role、一次 dept_role（按整条组链 in），角色再按 id 批量取一次，
	 * 不做「按角色逐条 getById」的 N+1。已停用的角色与直挂角色一样被忽略。
	 */
	private Set<String> resolveUserAuthorities(String userId, List<String> deptChainIds) {
		Set<String> roleIds = new LinkedHashSet<>();
		userRoleMapper.selectList(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, userId)).stream()
				.map(UserRole::getRoleId).filter(StringUtils::hasText).forEach(roleIds::add);
		if (!CollectionUtils.isEmpty(deptChainIds)) {
			deptRoleMapper.selectList(Wrappers.<DeptRole>lambdaQuery().in(DeptRole::getDeptId, deptChainIds)).stream()
					.map(DeptRole::getRoleId).filter(StringUtils::hasText).forEach(roleIds::add);
		}
		if (roleIds.isEmpty()) {
			return new HashSet<>();
		}
		return roleService.listByIds(roleIds).stream()
				.filter(role -> role != null && Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID))
				.flatMap(role -> toAuthorityNames(role).stream()).collect(Collectors.toCollection(HashSet::new));
	}

	public Set<String> toAuthorityNames(Role role) {
		Set<String> authorities = new HashSet<>();
		if (StringUtils.hasText(role.getCode())) {
			authorities.add("ROLE_" + role.getCode());
		}
		if (isNotBlank(role.getAuthority())) {
			Arrays.stream(role.getAuthority().split(",")).filter(StringUtils::hasText).forEach(authorities::add);
		}
		// 超级管理员天然拥有全部权限：把权限目录里的所有串直接注进来。
		// 之前只认 t_role.authority 里存的串，结果目录新增权限（如 system:log:list）后，
		// 管理员在页面显示「全勾选」，实际调接口却被 403 挡住（/api/system/audit/list 就是例子）。
		if ("admin".equals(role.getCode())) {
			for (PermissionEnum permission : PermissionEnum.values()) {
				// 学员专属（开始答题/开始练习/错题本/学员视角）不注入管理员：
				// 否则管理员页面会一直出现「开始答题」，前端只能逐页兜底。
				if (!permission.isStudentOnly()) {
					authorities.add(permission.getCode());
				}
			}
		}
		return authorities;
	}

	public boolean checkUsernameExist(String username) {
		Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery()
				.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()).eq(Account::getAuthAccount, username));
		if (account != null) {
			return true;
		}
		return false;
	}

	public void validateCaptcha(AuthRequest request) {
		SystemInfo systemInfo = systemService.getSystemInfo();
		if (systemInfo.getSetting() != null && Boolean.TRUE.equals(systemInfo.getSetting().getCaptchaEnabled())) {
			// 验证码已开启
			CaptchaVO captchaVO = new CaptchaVO();
			captchaVO.setCaptchaVerification(request.getCaptchaVerification());
			ResponseModel response = captchaService.verification(captchaVO);
			if (response.isSuccess() == false) {
				// 验证码校验失败，返回信息告诉前端
				// repCode 0000 无异常，代表成功
				// repCode 9999 服务器内部异常
				// repCode 0011 参数不能为空
				// repCode 6110 验证码已失效，请重新获取
				// repCode 6111 验证失败
				// repCode 6112 获取验证码失败,请联系管理员
				// repCode 6113 底图未初始化成功，请检查路径
				// repCode 6201 get接口请求次数超限，请稍后再试!
				// repCode 6206 无效请求，请重新获取验证码
				// repCode 6202 接口验证失败数过多，请稍后再试
				// repCode 6204 check接口请求次数超限，请稍后再试!
				throw new ValidationException(response.getRepMsg());
			}
		}
	}

	public String i18n(String key, Object... args) {
		return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
	}

}
