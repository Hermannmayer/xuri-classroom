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
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import jakarta.validation.ValidationException;
import java.util.*;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isNotBlank;










@Component
@RequiredArgsConstructor
@Slf4j
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

		deptService.assertDeptValid(existAccount.getUserId());

		return userViewMapper.toUserView(existAccount);
	}

	public UserInfo buildUserInfo(String userId) {
		User user = userMapper.selectById(userId);
		if (user == null) {
			return null;
		}
		UserInfo userInfo = userViewMapper.toUserInfo(user);

		java.util.Map<String, Object> prefs = userMapper.selectUiPrefs(userId);
		if (prefs != null) {
			Object zoom = prefs.get("uiZoom");
			Object theme = prefs.get("uiTheme");
			userInfo.setUiZoom(zoom == null ? null : String.valueOf(zoom));
			userInfo.setUiTheme(theme == null ? null : String.valueOf(theme));
		}

		List<String> extraDeptIds = deptService.listExtraDeptIds(user.getId());
		Map<String, Dept> deptMap = deptService.loadDeptMap();
		List<String> deptChainIds = deptService.resolveDeptChainIds(deptService.mergeDeptIds(user.getDeptId(), extraDeptIds), deptMap);



		Set<String> authorities = resolveUserAuthorities(user.getId(), deptChainIds);
		userInfo.setAuthorities(authorities.stream()
				.map(authority -> (GrantedAuthority) () -> authority).collect(Collectors.toSet()));


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

	/** 最终权限集合：t_user_role（直挂角色）∪ t_dept_role（组链上绑定的角色） */
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



		if ("admin".equals(role.getCode())) {
			for (PermissionEnum permission : PermissionEnum.values()) {


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

			CaptchaVO captchaVO = new CaptchaVO();
			captchaVO.setCaptchaVerification(request.getCaptchaVerification());
			try {
				ResponseModel response = captchaService.verification(captchaVO);
				if (response == null || !Boolean.TRUE.equals(response.isSuccess())) {












					String message = response == null ? null : response.getRepMsg();
					if (message == null || message.contains("服务出了点问题")) {
						message = "验证码服务暂时不可用，请稍后重试";
					}
					throw new ValidationException(message);
				}
			}
			catch (ValidationException e) {
				throw e;
			}
			catch (Exception e) {

				log.error("验证码校验异常", e);
				throw new ValidationException("验证码服务暂时不可用，请稍后重试");
			}
		}
	}

	public String i18n(String key, Object... args) {
		return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
	}

}
