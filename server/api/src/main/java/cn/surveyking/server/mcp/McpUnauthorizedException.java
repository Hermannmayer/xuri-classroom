package cn.surveyking.server.mcp;

/**
 * 令牌无效 / 已撤销 / 已过期 / 对应用户不可用。
 *
 * <p>单独一个异常类型是为了让 {@code McpApi} 能精确映射成 HTTP 401 + {@code WWW-Authenticate}，
 * 而不是被全局异常处理器包成 500 或 400——MCP 客户端（看状态码的）需要 401 才会提示用户重新配置令牌。
 */
public class McpUnauthorizedException extends RuntimeException {

	public McpUnauthorizedException(String message) {
		super(message);
	}

}
