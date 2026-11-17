package cn.surveyking.server.mcp;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * MCP 端点：{@code POST /mcp}（计划 §7.2）。
 *
 * <p>刻意不用 {@code @RequestBody} + 返回对象的写法：
 * <ul>
 * <li>全站 {@code CustomResponseBodyAdvice} 会把任何返回体包成 {@code {code,message,data}}，
 * MCP 客户端要的是纯 JSON-RPC，包一层直接不认；</li>
 * <li>直接读写 servlet 请求/响应，也就不受内容协商（{@code Accept: application/json,
 * text/event-stream}）和 {@code Content-Type} 缺省值影响——MCP 客户端这两种头部写法都有。</li>
 * </ul>
 *
 * <p>路径就是 {@code /mcp}（不带 {@code /api} 前缀）：MCP 客户端的 {@code mcp.json} 里
 * 通常直接写 {@code https://host/mcp}；审计侧 {@code AuditRecorder} 已经把 {@code /mcp} 与
 * {@code /api/mcp} 都识别为 {@code source=mcp}。
 *
 * <p>这不是 {@code /api/**} 路径，所以 Spring Security 的 {@code authenticated()} 不覆盖它，
 * 鉴权完全由 {@link McpTokenResolver} 按 Bearer 令牌做——MCP 客户端不会带 Cookie。
 */
@RestController
@RequiredArgsConstructor
public class McpApi {

	private static final String METHOD_NOT_ALLOWED_BODY = "{\"error\":\"method_not_allowed\","
			+ "\"error_description\":\"MCP 端点只接受 POST /mcp（本实现不提供 SSE 长连接）\"}";

	private static final String PAYLOAD_TOO_LARGE_BODY = "{\"error\":\"payload_too_large\","
			+ "\"error_description\":\"请求体超过 8MB\"}";

	private final McpServer mcpServer;

	/**
	 * JSON-RPC 入口。
	 *
	 * <p>状态码约定：令牌问题 401（带 {@code WWW-Authenticate}）；其它一律 200，
	 * 业务/协议错误放在 JSON-RPC 的 {@code error} 或工具结果的 {@code isError} 里。
	 */
	@PostMapping("/mcp")
	public void handle(HttpServletRequest request, HttpServletResponse response) throws IOException {
		String body;
		try {
			body = readBody(request);
		}
		catch (IllegalArgumentException tooLarge) {
			response.setHeader(HttpHeaders.ALLOW, "POST");
			write(response, HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE, PAYLOAD_TOO_LARGE_BODY);
			return;
		}
		try {
			McpServer.HttpResult result = mcpServer.handle(body, request);
			write(response, result.status(), result.body());
		}
		catch (McpUnauthorizedException e) {
			// 401 才会让 MCP 客户端提示「令牌需要更新」；500/400 会被当成服务端故障去重试
			response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer error=\"invalid_token\"");
			write(response, HttpServletResponse.SC_UNAUTHORIZED, mcpServer.unauthorizedBody(e.getMessage()));
		}
	}

	/** 本实现不支持 SSE 长连接：GET 明确 405，别让客户端以为服务端挂了 */
	@GetMapping("/mcp")
	public void handleGet(HttpServletResponse response) throws IOException {
		response.setHeader(HttpHeaders.ALLOW, "POST");
		write(response, HttpServletResponse.SC_METHOD_NOT_ALLOWED, METHOD_NOT_ALLOWED_BODY);
	}

	/** 手工读请求体：上限 8MB，避免一次超大 schema 把堆吃满 */
	private static String readBody(HttpServletRequest request) throws IOException {
		try (InputStream in = request.getInputStream()) {
			byte[] bytes = in.readNBytes(McpServer.MAX_BODY_BYTES + 1);
			if (bytes.length > McpServer.MAX_BODY_BYTES) {
				throw new IllegalArgumentException("request body too large");
			}
			return new String(bytes, StandardCharsets.UTF_8);
		}
	}

	private static void write(HttpServletResponse response, int status, String body) throws IOException {
		response.setStatus(status);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setContentType("application/json");
		// 令牌与业务数据都不该被中间层缓存
		response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
		if (body != null && !body.isEmpty()) {
			response.getWriter().write(body);
		}
		response.flushBuffer();
	}

}
