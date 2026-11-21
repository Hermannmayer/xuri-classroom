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



















@RestController
@RequiredArgsConstructor
public class McpApi {

	private static final String METHOD_NOT_ALLOWED_BODY = "{\"error\":\"method_not_allowed\","
			+ "\"error_description\":\"MCP 端点只接受 POST /mcp（本实现不提供 SSE 长连接）\"}";

	private static final String PAYLOAD_TOO_LARGE_BODY = "{\"error\":\"payload_too_large\","
			+ "\"error_description\":\"请求体超过 8MB\"}";

	private final McpServer mcpServer;

	/** JSON-RPC 入口 */
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

		response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
		if (body != null && !body.isEmpty()) {
			response.getWriter().write(body);
		}
		response.flushBuffer();
	}

}
