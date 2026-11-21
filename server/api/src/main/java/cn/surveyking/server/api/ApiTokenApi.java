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
