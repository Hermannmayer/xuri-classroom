package cn.surveyking.server.mcp;

/**
 * 令牌有效，但工具不在它的白名单（{@code t_api_token.scopes}）里。
 *
 * <p>不是 401：凭据本身没问题，是「这个令牌不许用这个工具」，因此映射成 JSON-RPC 错误
 * （{@code -32001}）而不是 HTTP 401，避免客户端把用户踢回「重新配置令牌」的流程。
 */
public class McpForbiddenException extends RuntimeException {

	public McpForbiddenException(String message) {
		super(message);
	}

}
