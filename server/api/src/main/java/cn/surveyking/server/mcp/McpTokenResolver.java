package cn.surveyking.server.mcp;

import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.ApiToken;
import cn.surveyking.server.service.ApiTokenService;
import cn.surveyking.server.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

/**
 * 把 {@code Authorization: Bearer <token>} 换成 SecurityContext 里的登录用户。
 *
 * <p>这是整套 MCP 权限模型的关键一步：令牌只负责「你是谁」，**权限完全来自用户本身**。
 * 因此 9 个工具一个 {@code hasRole}/{@code hasAuthority} 判断都不用另写，
 * 直接复用现有 {@code @PreAuthorize} —— 权限页改一次，MCP 立刻跟着变。
 *
 * <p>失败一律抛 {@link McpUnauthorizedException}（HTTP 401）：令牌不存在 / 已撤销 / 已过期 /
 * 对应用户被停用。**不区分**这些原因对外只说一句，避免拿它做「某个令牌是否还活着」的探测。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class McpTokenResolver {

	private static final String BEARER_PREFIX = "Bearer ";

	private final ApiTokenService apiTokenService;

	private final UserService userService;

	/**
	 * 解析并写入 SecurityContext。
	 * @throws McpUnauthorizedException 凭据缺失或不可用
	 */
	public McpCaller resolve(HttpServletRequest request) {
		String header = request == null ? null : request.getHeader(HttpHeaders.AUTHORIZATION);
		if (!StringUtils.hasText(header)
				|| !header.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
			throw new McpUnauthorizedException("缺少 Authorization: Bearer <token> 请求头");
		}
		String raw = header.substring(BEARER_PREFIX.length()).trim();
		if (!StringUtils.hasText(raw)) {
			throw new McpUnauthorizedException("Bearer 后面没有令牌");
		}
		ApiToken token = apiTokenService.authenticate(raw);
		if (token == null) {
			throw new McpUnauthorizedException("令牌无效、已撤销或已过期");
		}
		UserInfo user = userService.loadUserById(token.getUserId());
		if (user == null || !user.isEnabled()) {
			throw new McpUnauthorizedException("令牌对应的用户不存在或已停用");
		}
		UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(user, null,
				user.getAuthorities());
		authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
		SecurityContextHolder.getContext().setAuthentication(authentication);
		// last_used_at 是排障信息：失败了也只打日志（服务实现内部已吞异常）
		apiTokenService.touchLastUsed(token.getId());
		List<String> scopes = ApiTokenService.parseScopes(token.getScopes());
		return new McpCaller(token.getId(), token.getName(), token.getUserId(), user.getName(), scopes);
	}

}
