package cn.surveyking.server.mcp;

import cn.surveyking.server.core.audit.AuditRecorder;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.domain.dto.DownloadQuery;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectStatusRequest;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.service.ApiIdempotencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;



























@Slf4j
@Component
@RequiredArgsConstructor
public class McpServer {


	public static final String PROTOCOL_VERSION = "2025-03-26";

	public static final String SERVER_NAME = "xuri-classroom";


	static final int PARSE_ERROR = -32700;

	static final int INVALID_REQUEST = -32600;

	static final int METHOD_NOT_FOUND = -32601;

	static final int INVALID_PARAMS = -32602;

	static final int INTERNAL_ERROR = -32603;


	static final int FORBIDDEN = -32001;


	static final int MAX_BODY_BYTES = 8 * 1024 * 1024;

	private static final ZoneId ZONE = ZoneId.of("GMT+8");

	private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");







	private static final ObjectMapper LENIENT = JsonMapper.builder()
			.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();

	private final McpTokenResolver tokenResolver;

	private final McpTools tools;

	private final ApiIdempotencyService idempotencyService;

	private final AuditRecorder auditRecorder;


	private final ObjectMapper objectMapper;


	@Value("${version:}")
	private String serverVersion = "";

	/**
	 * 处理一次 MCP 请求。
	 * @param body 请求体（可能为空）
	 * @param request 当前请求，用于取 Authorization
	 * @throws McpUnauthorizedException 令牌缺失 / 无效 / 已撤销 / 已过期
	 */
	public HttpResult handle(String body, HttpServletRequest request) {
		McpCaller caller = tokenResolver.resolve(request);
		try {
			return dispatch(body, caller);
		}
		finally {

			SecurityContextHolder.clearContext();
		}
	}

	/** 401 的响应体（OAuth 2.0 风格的错误描述，MCP 客户端认这个） */
	public String unauthorizedBody(String message) {
		Map<String, Object> error = new LinkedHashMap<>();
		error.put("error", "invalid_token");
		error.put("error_description", message);
		return toJson(error);
	}


	public record HttpResult(int status, String body) {
	}

	private HttpResult dispatch(String body, McpCaller caller) {
		if (!StringUtils.hasText(body)) {
			return error(null, PARSE_ERROR, "请求体为空");
		}
		JsonNode root;
		try {
			root = objectMapper.readTree(body);
		}
		catch (Exception e) {
			return error(null, PARSE_ERROR, "请求体不是合法 JSON");
		}
		if (root == null || root.isNull() || !root.isObject()) {

			return error(null, INVALID_REQUEST, "只接受单个 JSON-RPC 对象（不支持批量数组）");
		}
		JsonNode id = root.get("id");
		boolean notification = id == null || id.isNull();
		String method = root.path("method").asString(null);
		if (!StringUtils.hasText(method)) {
			return error(id, INVALID_REQUEST, "缺少 method");
		}
		try {
			return switch (method) {
				case "initialize" -> ok(id, initializeResult());
				case "ping" -> ok(id, new LinkedHashMap<String, Object>());
				case "tools/list" -> ok(id, toolsList(caller));
				case "tools/call" -> ok(id, callTool(root.path("params"), caller));
				default -> {
					if (notification && method.startsWith("notifications/")) {

						yield new HttpResult(202, "");
					}
					yield error(id, METHOD_NOT_FOUND, "不支持的方法：" + method);
				}
			};
		}
		catch (McpForbiddenException e) {
			return error(id, FORBIDDEN, e.getMessage());
		}
		catch (McpInvalidParamsException e) {
			return error(id, INVALID_PARAMS, e.getMessage());
		}
		catch (Exception e) {
			log.error("MCP 处理失败 method={}", method, e);
			return error(id, INTERNAL_ERROR, "服务端处理失败：" + e.getClass().getSimpleName());
		}
	}

	private Map<String, Object> initializeResult() {
		Map<String, Object> capabilities = new LinkedHashMap<>();
		capabilities.put("tools", new LinkedHashMap<String, Object>());
		Map<String, Object> serverInfo = new LinkedHashMap<>();
		serverInfo.put("name", SERVER_NAME);
		serverInfo.put("version", StringUtils.hasText(serverVersion) ? serverVersion : "unknown");
		serverInfo.put("title", "旭日云课堂");
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("protocolVersion", PROTOCOL_VERSION);
		result.put("capabilities", capabilities);
		result.put("serverInfo", serverInfo);
		result.put("instructions", "旭日云课堂 MCP：9 类工具（导出拆成 create/get，共 10 个）。"
				+ "先调 sk_capabilities 看当前令牌能用什么；写工具必须带 idempotencyKey。");
		return result;
	}

	private Map<String, Object> toolsList(McpCaller caller) {
		List<Map<String, Object>> items = new ArrayList<>();
		for (McpToolDefinition definition : McpToolCatalog.visibleTo(caller)) {
			Map<String, Object> item = new LinkedHashMap<>();
			item.put("name", definition.name());
			item.put("description", definition.description());
			item.put("inputSchema", readJson(definition.inputSchema()));
			Map<String, Object> annotations = new LinkedHashMap<>();
			annotations.put("title", definition.title());

			annotations.put("readOnlyHint", !definition.write());
			annotations.put("destructiveHint", false);
			item.put("annotations", annotations);
			items.add(item);
		}
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("tools", items);
		return result;
	}

	/**
	 * {@code tools/call} 的实现：白名单 → 幂等 → 执行 → 审计。
	 *

	 */
	private Object callTool(JsonNode params, McpCaller caller) {
		if (params == null || !params.isObject()) {
			throw new McpInvalidParamsException("tools/call 缺少 params");
		}
		String name = params.path("name").asString(null);
		if (!StringUtils.hasText(name)) {
			throw new McpInvalidParamsException("缺少工具名 name");
		}
		McpToolDefinition definition = McpToolCatalog.find(name)
				.orElseThrow(() -> new McpInvalidParamsException("未知工具：" + name));
		if (!caller.allowsTool(definition.name())) {
			throw new McpForbiddenException("该令牌（" + caller.tokenName() + "）的白名单里没有工具 " + name);
		}
		JsonNode args = params.path("arguments");
		if (args.isMissingNode() || args.isNull()) {
			args = null;
		}
		String idempotencyKey = definition.write() ? text(args, "idempotencyKey") : null;
		if (definition.write() && !StringUtils.hasText(idempotencyKey)) {
			throw new McpInvalidParamsException("写工具 " + name + " 必须带 idempotencyKey（幂等键），否则拒绝执行");
		}
		String composed = StringUtils.hasText(idempotencyKey)
				? ApiIdempotencyService.composeKey(definition.name(), idempotencyKey) : null;
		String targetId = targetIdOf(args);
		String action = actionOf(definition.name());
		String detail = "tool=" + definition.name() + " · token=" + caller.tokenName() + " · user="
				+ caller.userId();

		if (composed != null) {
			String cached = idempotencyService.find(caller.userId(), composed);
			if (cached != null) {
				auditRecorder.record(action, targetId, detail + " · 幂等命中，回放上次结果", true, null);
				return toolResult(cached, false);
			}
		}

		try {
			Object raw = invoke(definition.name(), args, caller);
			String json = toJson(raw);
			if (composed != null) {
				idempotencyService.remember(caller.userId(), composed, json);
			}
			auditRecorder.record(action, targetId, detail + " · 成功", true, null);
			return toolResult(json, false);
		}
		catch (McpInvalidParamsException e) {

			throw e;
		}
		catch (AccessDeniedException e) {


			String message = reasonOf(e, definition);
			auditRecorder.record(action, targetId, detail, false, message);
			return toolResult("执行失败：" + message, true);
		}
		catch (Exception e) {
			String message = messageOf(e);
			auditRecorder.record(action, targetId, detail, false, message);
			log.warn("MCP 工具执行失败 tool={} token={} 原因={}", definition.name(), caller.tokenName(), message);
			return toolResult("执行失败：" + message, true);
		}
	}

	/** 工具分发：参数在这里显式挑，不把整包 JSON 直接反序列化成 DTO（避免未知字段把调用打挂） */
	private Object invoke(String name, JsonNode args, McpCaller caller) {
		return switch (name) {
			case "sk_capabilities" -> tools.capabilities(caller);
			case "sk_project_list" -> tools.projectList(projectQuery(args));
			case "sk_project_get" -> tools.projectGet(requiredText(args, "id"));
			case "sk_project_validate" -> tools.projectValidate(text(args, "projectId"),
					bean(args, "schema", SurveySchema.class), projectMode(args));
			case "sk_project_create" -> tools.projectCreate(projectRequest(args));
			case "sk_project_update" -> tools.projectUpdate(projectRequest(args));
			case "sk_project_publish" -> tools.projectPublish(projectStatus(args));
			case "sk_report_get" -> tools.reportGet(requiredText(args, "projectId"), text(args, "view"),
					text(args, "classId"));
			case "sk_export_create" -> tools.exportCreate(downloadQuery(args));
			case "sk_export_get" -> tools.exportGet(requiredText(args, "jobId"));
			default -> throw new McpInvalidParamsException("未知工具：" + name);
		};
	}

	private ProjectQuery projectQuery(JsonNode args) {
		ProjectQuery query = new ProjectQuery();
		query.setMode(projectMode(args));

		query.setName(text(args, "keyword"));
		query.setCategory(text(args, "category"));
		Integer current = integer(args, "current");
		if (current != null && current > 0) {
			query.setCurrent(current);
		}
		Integer pageSize = integer(args, "pageSize");
		if (pageSize != null && pageSize > 0) {
			query.setPageSize(Math.min(pageSize, McpToolCatalog.PAGE_LIMIT));
		}
		return query;
	}

	private ProjectRequest projectRequest(JsonNode args) {
		ProjectRequest request = new ProjectRequest();
		request.setId(text(args, "id"));
		request.setName(text(args, "name"));
		request.setMode(projectMode(args));
		request.setCategory(text(args, "category"));
		request.setSurvey(bean(args, "survey", SurveySchema.class));
		request.setSetting(bean(args, "setting", ProjectSetting.class));
		return request;
	}

	private ProjectStatusRequest projectStatus(JsonNode args) {
		ProjectStatusRequest request = new ProjectStatusRequest();
		request.setId(requiredText(args, "id"));
		request.setStatus(integer(args, "status"));
		return request;
	}

	private ProjectModeEnum projectMode(JsonNode args) {
		String mode = text(args, "mode");
		if (!StringUtils.hasText(mode)) {
			return null;
		}
		try {
			return ProjectModeEnum.valueOf(mode.trim().toLowerCase(Locale.ROOT));
		}
		catch (IllegalArgumentException e) {
			throw new McpInvalidParamsException("mode 只能是 survey / exam / folder，收到：" + mode);
		}
	}

	private DownloadQuery downloadQuery(JsonNode args) {
		DownloadQuery query = new DownloadQuery();
		query.setProjectId(requiredText(args, "projectId"));


		query.setClassId(text(args, "classId"));
		query.setAttemptNo(integer(args, "attemptNo"));
		query.setIncludeAnalysis(bool(args, "includeAnalysis"));
		query.setIncludeImages(bool(args, "includeImages"));
		query.setStartTime(date(args, "startTime"));
		query.setEndTime(date(args, "endTime"));
		JsonNode ids = args == null ? null : args.get("ids");
		if (ids != null && ids.isArray()) {
			List<String> list = new ArrayList<>();
			ids.forEach(node -> list.add(node.asString()));
			query.setIds(list);
		}
		query.setType(DownloadQuery.DownloadType.answerPdf);
		return query;
	}

	private Date date(JsonNode args, String field) {
		String value = text(args, field);
		if (!StringUtils.hasText(value)) {
			return null;
		}
		try {
			LocalDateTime time = LocalDateTime.parse(value.trim().replace(' ', 'T'),
					DateTimeFormatter.ISO_LOCAL_DATE_TIME);
			return Date.from(time.atZone(ZONE).toInstant());
		}
		catch (Exception e) {
			throw new McpInvalidParamsException(field + " 格式应为 yyyy-MM-dd HH:mm:ss，收到：" + value);
		}
	}

	// ---------- 参数读取

	private static String text(JsonNode args, String field) {
		if (args == null) {
			return null;
		}
		JsonNode node = args.get(field);
		if (node == null || node.isNull()) {
			return null;
		}
		return node.asString();
	}

	private String requiredText(JsonNode args, String field) {
		String value = text(args, field);
		if (!StringUtils.hasText(value)) {
			throw new McpInvalidParamsException("缺少参数 " + field);
		}
		return value.trim();
	}

	private static Integer integer(JsonNode args, String field) {
		if (args == null) {
			return null;
		}
		JsonNode node = args.get(field);
		if (node == null || node.isNull()) {
			return null;
		}
		if (!node.isNumber() && !(node.isString() && StringUtils.hasText(node.asString()))) {
			throw new McpInvalidParamsException("参数 " + field + " 应该是整数");
		}
		try {
			return node.asInt();
		}
		catch (Exception e) {
			throw new McpInvalidParamsException("参数 " + field + " 应该是整数");
		}
	}

	private static Boolean bool(JsonNode args, String field) {
		if (args == null) {
			return null;
		}
		JsonNode node = args.get(field);
		if (node == null || node.isNull()) {
			return null;
		}
		if (node.isBoolean()) {
			return node.asBoolean();
		}
		String value = node.asString();
		if ("true".equalsIgnoreCase(value) || "false".equalsIgnoreCase(value)) {
			return Boolean.valueOf(value);
		}
		throw new McpInvalidParamsException("参数 " + field + " 应该是 true/false");
	}

	private static <T> T bean(JsonNode args, String field, Class<T> type) {
		if (args == null) {
			return null;
		}
		JsonNode node = args.get(field);
		if (node == null || node.isNull() || node.isMissingNode()) {
			return null;
		}
		try {
			return LENIENT.convertValue(node, type);
		}
		catch (Exception e) {
			throw new McpInvalidParamsException(field + " 结构不正确：" + messageOf(e));
		}
	}

	// ---------- 输出

	private Object toolResult(String text, boolean isError) {
		Map<String, Object> item = new LinkedHashMap<>();
		item.put("type", "text");
		item.put("text", text);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("content", List.of(item));
		result.put("isError", isError);
		return result;
	}

	private HttpResult ok(JsonNode id, Object result) {
		Map<String, Object> response = new LinkedHashMap<>();
		response.put("jsonrpc", "2.0");
		response.put("id", idOf(id));
		response.put("result", result);
		return new HttpResult(200, toJson(response));
	}

	private HttpResult error(JsonNode id, int code, String message) {
		Map<String, Object> error = new LinkedHashMap<>();
		error.put("code", code);
		error.put("message", message);
		Map<String, Object> response = new LinkedHashMap<>();
		response.put("jsonrpc", "2.0");
		response.put("id", idOf(id));
		response.put("error", error);
		return new HttpResult(200, toJson(response));
	}

	/** JSON-RPC 要求错误响应里也得有 id，没有时是 JSON null；Map 里放 null 会被序列化配置吃掉，这里显式给 null 节点 */
	private Object idOf(JsonNode id) {
		return id == null || id.isNull() ? readJson("null") : id;
	}

	private JsonNode readJson(String json) {
		try {
			return objectMapper.readTree(json);
		}
		catch (Exception e) {
			log.warn("解析内置 JSON 失败: {}", json, e);
			return null;
		}
	}

	private String toJson(Object value) {
		try {
			return objectMapper.writeValueAsString(value);
		}
		catch (Exception e) {
			log.error("MCP 响应序列化失败", e);
			return "{\"jsonrpc\":\"2.0\",\"id\":null,\"error\":{\"code\":" + INTERNAL_ERROR
					+ ",\"message\":\"响应序列化失败\"}}";
		}
	}

	/** 审计动作码：sk_project_create → MCP_SK_PROJECT_CREATE */
	static String actionOf(String toolName) {
		return "MCP_" + toolName.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
	}

	/** 审计的目标 id：按约定优先级从参数里挑一个，取不到就是 null */
	static String targetIdOf(JsonNode args) {
		if (args == null) {
			return null;
		}
		for (String field : new String[] { "id", "projectId", "jobId" }) {
			JsonNode node = args.get(field);
			if (node != null && !node.isNull() && StringUtils.hasText(node.asString())) {
				return node.asString();
			}
		}
		return null;
	}

	/**
	 * 403 的可读原因。
	 *
	 * <p>Spring Security 自己抛的 {@code AccessDeniedException} message 恒为「Access Denied」，
	 * 对模型毫无信息量；业务代码抛的（班级不可见、只能改自己的……）则是一句中文原因，必须原样透出。
	 */
	private static String reasonOf(AccessDeniedException e, McpToolDefinition definition) {
		String raw = e.getMessage();
		boolean generic = !StringUtils.hasText(raw) || "Access Denied".equalsIgnoreCase(raw.trim())
				|| "Access is denied".equalsIgnoreCase(raw.trim());
		if (!generic) {
			return raw;
		}
		return definition != null && definition.permission() != null
				? "令牌绑定的用户没有 " + definition.permission() + " 权限（需要在「角色-权限」里勾选）"
				: "没有权限执行该操作";
	}

	private static String messageOf(Throwable e) {
		String message = e.getMessage();
		if (!StringUtils.hasText(message)) {
			message = e.getClass().getSimpleName();
		}

		int index = message.indexOf('\n');
		return index > 0 ? message.substring(0, index) : message;
	}

}