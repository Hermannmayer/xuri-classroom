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

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.List;
import java.util.Optional;

/**
 * @author javahuang
 * @date 2021/10/12
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("${api.prefix}")
public class UserApi {

	private final UserService userService;

	private final AuthenticationManager authenticationManager;

	private final AuthenticationCookieService authenticationCookieService;

	private final LoginAttemptLimiter loginAttemptLimiter;

	@PostMapping("/public/login")
	public ResponseEntity login(@RequestBody @Valid AuthRequest request, HttpServletRequest httpRequest) {
		userService.validateCaptcha(request);
		// 用统一解析：getRemoteAddr() 在 nginx 后面永远是 docker 网关，
		// 会让「同一账号 + 同一地址」的失败计数退化成「全站按账号锁定」。
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
			String token = authenticationCookieService.createToken(user.getUserId());
			HttpCookie cookie = authenticationCookieService.createCookie(token, httpRequest);
			return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString())
					.header(HttpHeaders.AUTHORIZATION, token).build();
		}
		catch (Exception e) {
			// 不要吞掉真实原因：登录失败常见于密码错、账号禁用、组有效期过期、鉴权链异常，
			// 统一转 1024 会把这些问题藏起来，排查时无从下手。这里至少把栈打进日志。
			org.slf4j.LoggerFactory.getLogger(UserApi.class).warn("登录失败 username={} ip={}", request.getUsername(),
					clientAddress, e);
			loginAttemptLimiter.recordFailure(request.getUsername(), clientAddress);
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

	/**
	 * 导入用户。
	 *
	 * <p>
	 * 「建用户按角色分权」无法在这一层判断：一行 Excel 里可以带任意角色，而 @PreAuthorize 只看调用方
	 * 有没有进入导入动作的权限（system:user:create / user:import / admin）。因此这里只守入口，
	 * 逐行角色分档交给服务层 {@code UserServiceImpl#importUser}：目标角色含 system:* 权限时要求
	 * {@code system:user:create:teacher}，纯学员类角色只要求 {@code system:user:create:student}
	 * 或 {@code system:user:create}；管理员不受限。校验不过整批回滚。
	 * @param request
	 */
	@PostMapping("/importUser")
	@PreAuthorize("hasAnyAuthority('user:import','system:user:create','system:user:create:student','system:user:create:teacher') or hasRole('admin')")
	public void importUser(UserRequest request) {
		userService.importUser(request);
	}

	/**
	 * 查询用户任务
	 * @param query
	 * @return
	 */
	/**
	 * 保存当前账号的界面缩放，换设备登录后也一致。
	 */
	@PostMapping("/user/ui-zoom")
	@PreAuthorize("isAuthenticated()")
	public void updateUiZoom(@RequestBody UserRequest request) {
		userService.updateUiZoom(request);
	}

	/**
	 * 保存当前账号的主题（light / dark），换设备登录后也一致。
	 */
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

	/**
	 * 查询历史任务
	 * @param query
	 * @return
	 */
	@GetMapping("/listHistoryTask")
	public PaginationResponse<MyTaskView> myHistoryTask(MyTaskQuery query) {
		return userService.queryHistoryTask(query);
	}

}