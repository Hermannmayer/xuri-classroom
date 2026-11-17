package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.ApiTokenRequest;
import cn.surveyking.server.domain.dto.ApiTokenView;
import cn.surveyking.server.service.ApiTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API Token 管理（计划 §7.3）：签发 / 列表 / 撤销。
 *
 * <p>三个接口同一权限口径 {@code system:setting:update}（管理员用 {@code hasRole('admin')} 兜底，
 * 与 {@code SystemApi} 的其它设置类接口一致）：令牌等于「以某个人的身份操作数据」，
 * 比普通设置更敏感，所以不给老师开默认入口——真要给，就去角色里勾这条权限。
 *
 * <p>签发只返回一次明文；列表永远拿不到明文（库里只有 SHA-256）。
 * 三个都是写接口，会被 {@code AuditAspect} 自动记进操作日志（{@code /api/system/api-token**}）。
 */
@RestController
@RequestMapping("${api.prefix}/system/api-token")
@RequiredArgsConstructor
public class ApiTokenApi {

	private final ApiTokenService apiTokenService;

	/**
	 * 令牌列表（含已撤销的，按签发时间倒序）。
	 * @return 数组；{@code token} 字段永远为空（明文只在签发响应里）
	 */
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	@GetMapping
	public List<ApiTokenView> list() {
		return apiTokenService.list();
	}

	/**
	 * 签发令牌：绑定当前登录用户，返回**明文一次**。
	 * @param request {@code {name, expiresAt?, scopes?}}
	 * @return 视图 + {@code token}（明文）
	 */
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	@PostMapping
	public ApiTokenView create(@RequestBody ApiTokenRequest request) {
		return apiTokenService.issue(request);
	}

	/**
	 * 撤销令牌：撤销后该令牌调 {@code /mcp} 立刻 401。
	 * @param request 只用到 {@code id}
	 */
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	@PostMapping("/revoke")
	public void revoke(@RequestBody ApiTokenRequest request) {
		apiTokenService.revoke(request == null ? null : request.getId());
	}

}
