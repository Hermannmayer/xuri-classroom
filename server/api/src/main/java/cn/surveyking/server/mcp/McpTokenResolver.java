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

		apiTokenService.touchLastUsed(token.getId());
		List<String> scopes = ApiTokenService.parseScopes(token.getScopes());
		return new McpCaller(token.getId(), token.getName(), token.getUserId(), user.getName(), scopes);
	}

}
