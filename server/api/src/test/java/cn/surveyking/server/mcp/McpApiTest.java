package cn.surveyking.server.mcp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code /mcp} 的 HTTP 契约：路径、状态码、响应体。
 *
 * <p>三条是 MCP 客户端真正会依赖的：
 * <ul>
 * <li>200 + 纯 JSON-RPC（**不能**被全站 {@code CustomResponseBodyAdvice} 包成 {@code {code,data}}）；</li>
 * <li>令牌无效必须是 401 + {@code WWW-Authenticate}；</li>
 * <li>GET（SSE 入口）必须 405，客户端才知道要回退到 POST。</li>
 * </ul>
 */
class McpApiTest {

	private final McpServer mcpServer = mock(McpServer.class);

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new McpApi(mcpServer)).build();
	}

	@Test
	@DisplayName("POST /mcp：原样输出 JSON-RPC，不套 {code,message,data}")
	void postReturnsRawJsonRpc() throws Exception {
		when(mcpServer.handle(anyString(), any())).thenReturn(new McpServer.HttpResult(200,
				"{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"protocolVersion\":\"2025-03-26\"}}"));
		mockMvc
				.perform(post("/mcp").contentType(MediaType.APPLICATION_JSON)
						.content("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\"}"))
				.andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.jsonrpc").value("2.0"))
				.andExpect(jsonPath("$.result.protocolVersion").value("2025-03-26"));
	}

	@Test
	@DisplayName("令牌无效：401 + WWW-Authenticate: Bearer")
	void unauthorizedIs401() throws Exception {
		when(mcpServer.handle(anyString(), any())).thenThrow(new McpUnauthorizedException("令牌无效、已撤销或已过期"));
		when(mcpServer.unauthorizedBody(anyString())).thenReturn("{\"error\":\"invalid_token\"}");
		mockMvc.perform(post("/mcp").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isUnauthorized())
				.andExpect(header().string("WWW-Authenticate", containsString("invalid_token")))
				.andExpect(jsonPath("$.error").value("invalid_token"));
	}

	@Test
	@DisplayName("GET /mcp：405 + Allow: POST（本实现不提供 SSE 长连接）")
	void getIsMethodNotAllowed() throws Exception {
		mockMvc.perform(get("/mcp")).andExpect(status().isMethodNotAllowed())
				.andExpect(header().string("Allow", containsString("POST")));
	}

}
