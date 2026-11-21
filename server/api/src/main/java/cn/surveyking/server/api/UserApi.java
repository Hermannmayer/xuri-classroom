package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.security.LoginAttemptLimiter;
import cn.surveyking.server.core.security.AuthenticationCookieService;
import cn.surveyking.server.core.uitls.RSAUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.UserService;
import com.anji.captcha.model.common.ResponseModel;
import com.anji.captcha.model.vo.CaptchaVO;
import com.anji.captcha.service.CaptchaService;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;





@RestController
@RequiredArgsConstructor
@RequestMapping("${api.prefix}")
public class UserApi {

	private final UserService userService;

	private final AuthenticationManager authenticationManager;

	private final AuthenticationCookieService authenticationCookieService;

	private final LoginAttemptLimiter loginAttemptLimiter;

	private final cn.surveyking.server.core.audit.AuditRecorder auditRecorder;

	@PostMapping("/public/login")
	public ResponseEntity login(@RequestBody @Valid AuthRequest request, HttpServletRequest httpRequest) {
		userService.validateCaptcha(request);


		String clientAddress = cn.surveyking.server.core.uitls.IPUtils.getClientIpAddress(httpRequest);
		if (!loginAttemptLimiter.isAllowed(request.getUsername(), clientAddress)) {
			throw new ErrorCodeException(ErrorCode.UsernameOrPasswordError);
		}
		Authentication authentication;
		try {
			String decryptPwd = RSAUtils.decrypt(request.getPassword());
			authentication = new UsernamePasswordAuthenticationToken(request.getUsername(), decryptPwd);
			Authentication authenticate = authenticationManager.authenticate(authentication);
			UserInfo user = (UserInfo) authenticate.getPrincipal();
			loginAttemptLimiter.recordSuccess(request.getUsername(), clientAddress);


			auditRecorder.record("AUTH_LOGIN", user.getUserId(), user.getName(),
					"登录成功 username=" + request.getUsername() + " ip=" + clientAddress, true, null,
					user.getUserId());
			String token = authenticationCookieService.createToken(user.getUserId());
			HttpCookie cookie = authenticationCookieService.createCookie(token, httpRequest);
			return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
					.header(HttpHeaders.AUTHORIZATION, token).build();
		}
		catch (Exception e) {


			org.slf4j.LoggerFactory.getLogger(UserApi.class).warn("登录失败 username={} ip={}", request.getUsername(),
					clientAddress, e);
			loginAttemptLimiter.recordFailure(request.getUsername(), clientAddress);

			auditRecorder.record("AUTH_LOGIN_FAILED", null,
					"登录失败 username=" + request.getUsername() + " ip=" + clientAddress, false, e.getMessage());
			throw new ErrorCodeException(ErrorCode.UsernameOrPasswordError);
		}
	}

	@PostMapping("/public/logout")
	public ResponseEntity logout(HttpServletRequest httpRequest) {
		HttpCookie cookie = authenticationCookieService.clearCookie(httpRequest);
		return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).build();
	}

	@PostMapping("/public/register")
	public void register(@RequestBody RegisterRequest request) {
		userService.register(request);
	}

	/** 注册页可选的班级：只返回开启了「开放注册」的班级，未登录可访问 */
	@GetMapping("/public/registerClasses")
	public List<RegisterClassView> getRegisterClasses() {
		return userService.getRegisterClasses();
	}

	/** 注册入口可用性：登录页只有 enabled=true 才显示「注册」 */
	@GetMapping("/public/registerOptions")
	public RegisterOptionsView getRegisterOptions() {
		return userService.getRegisterOptions();
	}

	@GetMapping("/currentUser")
	@PreAuthorize("isAuthenticated()")
	public UserInfo currentUser() {
		return userService.loadUserById(SecurityContextUtils.getUserId());
	}

	@GetMapping("/userOverview")
	@PreAuthorize("isAuthenticated()")
	public UserOverview userOverview() {
		return userService.getUserOverviewData();
	}

	@PostMapping("/user")
	@PreAuthorize("hasAuthority('user:update')")
	public UserInfo updateUser(@RequestBody UserProfileRequest request) {
		String userId = SecurityContextUtils.getUserId();
		userService.updateUserProfile(userId, request);
		return userService.loadUserById(SecurityContextUtils.getUserId());
	}

	@GetMapping("/public/listRegisterRole")
	public List<RegisterRoleView> getRegisterRoles() {
		return userService.getRegisterRoles();
	}

	/** 导入用户 */
	@PostMapping("/importUser")
	@PreAuthorize("hasAnyAuthority('user:import','system:user:create','system:user:create:student','system:user:create:teacher') or hasRole('admin')")
	public void importUser(UserRequest request) {
		userService.importUser(request);
	}









	@PostMapping("/user/ui-zoom")
	@PreAuthorize("isAuthenticated()")
	public void updateUiZoom(@RequestBody UserRequest request) {
		userService.updateUiZoom(request);
	}




	@PostMapping("/user/ui-theme")
	@PreAuthorize("isAuthenticated()")
	public void updateUiTheme(@RequestBody UserRequest request) {
		userService.updateUiTheme(request);
	}

	@GetMapping("/listUserTask")
	@PreAuthorize("isAuthenticated()")
	public PaginationResponse<MyTaskView> myTask(MyTaskQuery query) {
		return userService.queryTask(query);
	}

	/** 查询历史任务 */
	@GetMapping("/listHistoryTask")
	public PaginationResponse<MyTaskView> myHistoryTask(MyTaskQuery query) {
		return userService.queryHistoryTask(query);
	}

}