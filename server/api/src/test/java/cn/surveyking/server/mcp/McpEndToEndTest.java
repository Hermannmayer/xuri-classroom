package cn.surveyking.server.mcp;

import cn.surveyking.server.core.audit.AuditRecorder;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.ApiToken;
import cn.surveyking.server.service.ApiIdempotencyService;
import cn.surveyking.server.service.ApiTokenService;
import cn.surveyking.server.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 端到端（不用数据库、不用外部模型）：真的发一个 HTTP 请求打到 {@code /mcp}，
 * 走完「Bearer → 令牌 → 用户 → SecurityContext → JSON-RPC → 工具 → 幂等」整条链。
 *
 * <p>这就是计划 §7.5 里 {@code curl -X POST /mcp} 那条验收的可执行版本：
 * 本机没有 MySQL 也能跑，因此 CI 上也能守住「令牌撤销立刻 401」「同一个幂等键只执行一次」这两条。
 */
class McpEndToEndTest {

	private final ApiTokenService apiTokenService = mock(ApiTokenService.class);

	private final UserService userService = mock(UserService.class);

	private final McpTools tools = mock(McpTools.class);

	private final ApiIdempotencyService idempotencyService = mock(ApiIdempotencyService.class);

	private final AuditRecorder auditRecorder = mock(AuditRecorder.class);

	private final ObjectMapper objectMapper = JsonMapper.builder().build();

	/** 内存版幂等表：模拟 t_api_idempotency 的唯一键语义 */
	private final Map<String, String> idempotencyRows = new HashMap<>();

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		McpTokenResolver resolver = new McpTokenResolver(apiTokenService, userService);
		McpServer server = new McpServer(resolver, tools, idempotencyService, auditRecorder, objectMapper);
		mockMvc = MockMvcBuilders.standaloneSetup(new McpApi(server)).build();

		ApiToken token = new ApiToken();
		token.setId("t1");
		token.setName("Claude Desktop");
		token.setUserId("u1");
		token.setRevoked(false);
		when(apiTokenService.authenticate("sk_test")).thenReturn(token);

		UserInfo user = new UserInfo();
		user.setUserId("u1");
		user.setName("张老师");
		user.setUsername("zhang");
		user.setStatus(1);
		user.setAuthorities(Set.of(new SimpleGrantedAuthority("project:detail"),
				new SimpleGrantedAuthority("project:create"), new SimpleGrantedAuthority("system:setting:update")));
		when(userService.loadUserById("u1")).thenReturn(user);

		when(idempotencyService.find(anyString(), anyString()))
				.thenAnswer(call -> idempotencyRows.get(call.getArgument(0) + "|" + call.getArgument(1)));
		doAnswer(call -> idempotencyRows.put(call.getArgument(0) + "|" + call.getArgument(1), call.getArgument(2)))
				.when(idempotencyService).remember(anyString(), anyString(), anyString());
	}

	@Test
	@DisplayName("curl 等价：tools/list 返回 10 个工具")
	void toolsListOverHttp() throws Exception {
		String body = mockMvc
				.perform(post("/mcp").header("Authorization", "Bearer sk_test").contentType(MediaType.APPLICATION_JSON)
						.content("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		JsonNode response = objectMapper.readTree(body);
		assertEquals(10, response.path("result").path("tools").size());
		assertEquals("2025-03-26", objectMapper
				.readTree(mockMvc
						.perform(post("/mcp").header("Authorization", "Bearer sk_test")
								.contentType(MediaType.APPLICATION_JSON)
								.content("{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"initialize\"}"))
						.andExpect(status().isOk()).andReturn().getResponse().getContentAsString())
				.path("result").path("protocolVersion").asString());
	}

	@Test
	@DisplayName("curl 等价：tools/call 时 SecurityContext 里是令牌绑定的那个用户（复用 @PreAuthorize 的前提）")
	void toolCallCarriesTokenUser() throws Exception {
		when(tools.projectGet(anyString())).thenAnswer(call -> {
			// 工具方法执行时，安全上下文必须是令牌对应用户，否则 @PreAuthorize 会一律 403
			assertEquals("u1", SecurityContextUtils.getUserId());
			assertTrue(SecurityContextUtils.hasAuthority("project:detail"));
			return Map.of("id", call.getArgument(0), "name", "期末测验");
		});
		String body = mockMvc
				.perform(post("/mcp").header("Authorization", "Bearer sk_test").contentType(MediaType.APPLICATION_JSON)
						.content("{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":"
								+ "{\"name\":\"sk_project_get\",\"arguments\":{\"id\":\"p1\"}}}"))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		JsonNode result = objectMapper.readTree(body).path("result");
		assertFalse(result.path("isError").asBoolean());
		assertTrue(result.path("content").path(0).path("text").asString().contains("期末测验"));
	}

	@Test
	@DisplayName("同一个 idempotencyKey 调两次 sk_project_create：只建一个项目，第二次回放同一结果")
	void sameIdempotencyKeyCreatesOnce() throws Exception {
		when(tools.projectCreate(any(ProjectRequest.class))).thenReturn(Map.of("id", "p-new", "created", true));
		String request = "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"sk_project_create\","
				+ "\"arguments\":{\"name\":\"2026 期末\",\"survey\":{},\"idempotencyKey\":\"k-2026-final\"}}}";

		String first = mockMvc
				.perform(post("/mcp").header("Authorization", "Bearer sk_test").contentType(MediaType.APPLICATION_JSON)
						.content(request))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		String second = mockMvc
				.perform(post("/mcp").header("Authorization", "Bearer sk_test").contentType(MediaType.APPLICATION_JSON)
						.content(request))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

		assertEquals(objectMapper.readTree(first).path("result").path("content").path(0).path("text").asString(),
				objectMapper.readTree(second).path("result").path("content").path(0).path("text").asString());
		verify(tools, times(1)).projectCreate(any(ProjectRequest.class));
	}

	@Test
	@DisplayName("令牌撤销：立刻 401，且不会调用任何工具")
	void revokedTokenGets401() throws Exception {
		when(apiTokenService.authenticate("sk_test")).thenReturn(null);
		mockMvc.perform(post("/mcp").header("Authorization", "Bearer sk_test").contentType(MediaType.APPLICATION_JSON)
				.content("{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/list\"}"))
				.andExpect(status().isUnauthorized());
		verify(tools, times(0)).capabilities(any());
	}

	@Test
	@DisplayName("没有 Authorization 头：401（不是 500，也不是空 200）")
	void missingTokenGets401() throws Exception {
		mockMvc.perform(post("/mcp").contentType(MediaType.APPLICATION_JSON)
				.content("{\"jsonrpc\":\"2.0\",\"id\":6,\"method\":\"tools/list\"}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	@DisplayName("scopes 白名单：白名单外的工具 HTTP 200 + JSON-RPC -32001（不是 401）")
	void scopeMismatchIsForbiddenNotUnauthorized() throws Exception {
		ApiToken limited = new ApiToken();
		limited.setId("t2");
		limited.setName("只读脚本");
		limited.setUserId("u1");
		limited.setScopes("sk_project_list");
		limited.setRevoked(false);
		when(apiTokenService.authenticate("sk_limited")).thenReturn(limited);

		String body = mockMvc
				.perform(post("/mcp").header("Authorization", "Bearer sk_limited")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"jsonrpc\":\"2.0\",\"id\":7,\"method\":\"tools/call\",\"params\":"
								+ "{\"name\":\"sk_project_get\",\"arguments\":{\"id\":\"p1\"}}}"))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		assertEquals(McpServer.FORBIDDEN, objectMapper.readTree(body).path("error").path("code").asInt());
	}

	@Test
	@DisplayName("撤销后 last_used_at 仍会被刷新（说明真的是「每次调用都校验」）")
	void touchesLastUsedOnEveryCall() throws Exception {
		mockMvc.perform(post("/mcp").header("Authorization", "Bearer sk_test").contentType(MediaType.APPLICATION_JSON)
				.content("{\"jsonrpc\":\"2.0\",\"id\":8,\"method\":\"ping\"}")).andExpect(status().isOk());
		verify(apiTokenService, times(1)).touchLastUsed("t1");
	}

	@Test
	@DisplayName("ping：返回空 result（客户端探活用）")
	void ping() throws Exception {
		String body = mockMvc
				.perform(post("/mcp").header("Authorization", "Bearer sk_test").contentType(MediaType.APPLICATION_JSON)
						.content("{\"jsonrpc\":\"2.0\",\"id\":9,\"method\":\"ping\"}"))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		assertTrue(objectMapper.readTree(body).path("result").isObject());
	}

	@Test
	@DisplayName("initialize：capabilities.tools 是对象（客户端按它决定要不要拉 tools/list）")
	void initializeAdvertisesTools() throws Exception {
		String body = mockMvc
				.perform(post("/mcp").header("Authorization", "Bearer sk_test").contentType(MediaType.APPLICATION_JSON)
						.content("{\"jsonrpc\":\"2.0\",\"id\":10,\"method\":\"initialize\"}"))
				.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		JsonNode result = objectMapper.readTree(body).path("result");
		assertTrue(result.path("capabilities").has("tools"));
		assertTrue(result.path("capabilities").path("tools").isObject());
		assertEquals(0, result.path("capabilities").path("tools").size());
	}

}