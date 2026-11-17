package cn.surveyking.server.mcp;

import cn.surveyking.server.core.audit.AuditRecorder;
import cn.surveyking.server.service.ApiIdempotencyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import jakarta.validation.ValidationException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * MCP 协议层的契约回归：initialize / tools/list / tools/call、白名单、幂等、失败语义。
 *
 * <p>不启动 Spring：{@link McpTokenResolver} 与 {@link McpTools} 都是 mock，
 * 这样能精确断言「协议层有没有按约定发起调用」，也顺带把「无外部模型依赖即可跑」这条验收钉住。
 */
class McpServerTest {

	private final McpTokenResolver tokenResolver = mock(McpTokenResolver.class);

	private final McpTools tools = mock(McpTools.class);

	private final ApiIdempotencyService idempotencyService = mock(ApiIdempotencyService.class);

	private final AuditRecorder auditRecorder = mock(AuditRecorder.class);

	private final ObjectMapper objectMapper = JsonMapper.builder().build();

	private final McpCaller caller = new McpCaller("t1", "Claude Desktop", "u1", "张老师", List.of());

	private McpServer server;

	@BeforeEach
	void setUp() {
		server = new McpServer(tokenResolver, tools, idempotencyService, auditRecorder, objectMapper);
		when(tokenResolver.resolve(any())).thenReturn(caller);
	}

	@Test
	@DisplayName("initialize：回协议版本、工具能力与服务标识")
	void initialize() {
		JsonNode response = call("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\"}");
		assertEquals("2.0", response.path("jsonrpc").asString());
		JsonNode result = response.path("result");
		assertEquals(McpServer.PROTOCOL_VERSION, result.path("protocolVersion").asString());
		assertTrue(result.path("capabilities").has("tools"), result.toString());
		assertEquals(McpServer.SERVER_NAME, result.path("serverInfo").path("name").asString());
	}

	@Test
	@DisplayName("tools/list：10 个工具，名字与计划 §7.4 对齐，每个都带 inputSchema")
	void toolsList() {
		JsonNode response = call("{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}");
		JsonNode list = response.path("result").path("tools");
		// 计划里是 9 行，最后一行是 create + get 两个工具 → 实际 10 个
		assertEquals(10, list.size(), list.toString());
		List<String> names = new java.util.ArrayList<>();
		for (JsonNode tool : list) {
			names.add(tool.path("name").asString());
		}
		assertEquals(List.of("sk_capabilities", "sk_project_list", "sk_project_get", "sk_project_validate",
				"sk_project_create", "sk_project_update", "sk_project_publish", "sk_report_get", "sk_export_create",
				"sk_export_get"), names);
		for (JsonNode tool : list) {
			assertTrue(tool.path("inputSchema").isObject(), tool.path("name").asString());
			assertFalse(tool.path("description").asString().isBlank(), tool.path("name").asString());
			assertTrue(tool.path("annotations").path("readOnlyHint").isBoolean(), tool.path("name").asString());
		}
	}

	@Test
	@DisplayName("scopes 白名单：清单只剩白名单里的，白名单外的工具调用被拒（-32001）")
	void scopesWhitelist() {
		when(tokenResolver.resolve(any()))
				.thenReturn(new McpCaller("t2", "小脚本", "u1", "张老师", List.of("sk_project_list")));
		JsonNode list = call("{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/list\"}").path("result").path("tools");
		assertEquals(1, list.size(), list.toString());
		assertEquals("sk_project_list", list.path(0).path("name").asString());

		JsonNode denied = call(toolCall("sk_project_get", "{\"id\":\"p1\"}"));
		assertEquals(McpServer.FORBIDDEN, denied.path("error").path("code").asInt());
		verify(tools, never()).projectGet(anyString());
	}

	@Test
	@DisplayName("tools/call：只读工具正常返回 content[0].text，并记一条审计")
	void callReadOnlyTool() {
		when(tools.projectGet("p1")).thenReturn(Map.of("id", "p1", "name", "期末测验"));
		JsonNode response = call(toolCall("sk_project_get", "{\"id\":\"p1\"}"));
		assertFalse(response.path("result").path("isError").asBoolean());
		String text = response.path("result").path("content").path(0).path("text").asString();
		assertTrue(text.contains("期末测验"), text);
		verify(auditRecorder).record(eq("MCP_SK_PROJECT_GET"), eq("p1"), anyString(), eq(true), eq(null));
	}

	@Test
	@DisplayName("写工具没带 idempotencyKey：直接 -32602，不执行")
	void writeToolRequiresIdempotencyKey() {
		JsonNode response = call(toolCall("sk_project_create", "{\"name\":\"期末\"}"));
		assertEquals(McpServer.INVALID_PARAMS, response.path("error").path("code").asInt());
		verify(tools, never()).projectCreate(any());
	}

	@Test
	@DisplayName("幂等命中：直接回放上次结果，业务方法一次都不调")
	void idempotencyHitReplays() {
		String key = ApiIdempotencyService.composeKey("sk_project_publish", "k1");
		when(idempotencyService.find("u1", key)).thenReturn("{\"id\":\"p1\",\"status\":1}");
		JsonNode response = call(toolCall("sk_project_publish",
				"{\"id\":\"p1\",\"status\":1,\"idempotencyKey\":\"k1\"}"));
		String text = response.path("result").path("content").path(0).path("text").asString();
		assertEquals("{\"id\":\"p1\",\"status\":1}", text);
		verify(tools, never()).projectPublish(any());
		verify(idempotencyService, never()).remember(anyString(), anyString(), anyString());
	}

	@Test
	@DisplayName("幂等未命中：执行一次并把结果记进幂等表")
	void idempotencyMissExecutesOnce() {
		when(idempotencyService.find(anyString(), anyString())).thenReturn(null);
		when(tools.projectPublish(any())).thenReturn(Map.of("id", "p1", "status", 1));
		JsonNode response = call(toolCall("sk_project_publish",
				"{\"id\":\"p1\",\"status\":1,\"idempotencyKey\":\"k1\"}"));
		assertTrue(response.path("result").path("content").path(0).path("text").asString().contains("p1"));
		verify(tools).projectPublish(any());
		verify(idempotencyService).remember(eq("u1"),
				eq(ApiIdempotencyService.composeKey("sk_project_publish", "k1")), anyString());
	}

	@Test
	@DisplayName("工具抛业务异常：返回 isError=true 的文本结果（不是 500，也不吞掉原因）")
	void toolFailureIsErrorResult() {
		when(tools.projectGet("p404")).thenThrow(new ValidationException("项目不存在：p404"));
		JsonNode response = call(toolCall("sk_project_get", "{\"id\":\"p404\"}"));
		assertTrue(response.path("result").path("isError").asBoolean());
		String text = response.path("result").path("content").path(0).path("text").asString();
		assertTrue(text.contains("项目不存在"), text);
		verify(auditRecorder).record(eq("MCP_SK_PROJECT_GET"), eq("p404"), anyString(), eq(false), anyString());
	}

	@Test
	@DisplayName("缺参数：-32602，且提示缺哪个字段")
	void missingRequiredArgument() {
		JsonNode response = call(toolCall("sk_project_get", "{}"));
		assertEquals(McpServer.INVALID_PARAMS, response.path("error").path("code").asInt());
		assertTrue(response.path("error").path("message").asString().contains("id"));
	}

	@Test
	@DisplayName("未知方法 / 未知工具：分别是 -32601 与 -32602")
	void unknownMethodAndTool() {
		assertEquals(McpServer.METHOD_NOT_FOUND,
				call("{\"jsonrpc\":\"2.0\",\"id\":9,\"method\":\"tools/unknown\"}").path("error").path("code")
						.asInt());
		assertEquals(McpServer.INVALID_PARAMS,
				call(toolCall("sk_not_exists", "{}")).path("error").path("code").asInt());
	}

	@Test
	@DisplayName("坏 JSON：-32700；通知（无 id）不回业务结果")
	void parseErrorAndNotification() {
		JsonNode parseError = call("{oops");
		assertEquals(McpServer.PARSE_ERROR, parseError.path("error").path("code").asInt());
		assertTrue(parseError.path("id").isNull());

		McpServer.HttpResult notification = server.handle(
				"{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}", new MockHttpServletRequest());
		assertEquals(202, notification.status());
		assertEquals("", notification.body());
	}

	@Test
	@DisplayName("令牌无效：异常上抛给 Web 层（由 McpApi 映射成 401）")
	void unauthorizedPropagates() {
		when(tokenResolver.resolve(any())).thenThrow(new McpUnauthorizedException("令牌无效、已撤销或已过期"));
		assertThrows(McpUnauthorizedException.class,
				() -> server.handle("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\"}",
						new MockHttpServletRequest()));
	}

	// ---------- 辅助

	private JsonNode call(String body) {
		McpServer.HttpResult result = server.handle(body, new MockHttpServletRequest());
		assertEquals(200, result.status());
		assertNotNull(result.body());
		return objectMapper.readTree(result.body());
	}

	/** tools/call 的请求体；arguments 直接拼进去，测试里都是固定字符串 */
	private static String toolCall(String name, String arguments) {
		return "{\"jsonrpc\":\"2.0\",\"id\":11,\"method\":\"tools/call\",\"params\":{\"name\":\"" + name
				+ "\",\"arguments\":" + arguments + "}}";
	}

}
