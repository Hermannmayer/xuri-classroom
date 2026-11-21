package cn.surveyking.server.ai.core;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.security.RateLimiter;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.service.SystemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;































@Service
@RequiredArgsConstructor
@Slf4j
public class AiGateway {


	public static final Duration TIMEOUT = Duration.ofSeconds(120);


	private static final Duration LIST_MODELS_TIMEOUT = Duration.ofSeconds(20);


	private static final int MAX_RETRY = 2;


	private static final long RETRY_BACKOFF_MILLIS = 1000L;


	private static final int DEFAULT_RATE_LIMIT_PER_WINDOW = 10;


	private static final long RATE_WINDOW_MILLIS = 60_000L;

	private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";

	private static final String LEGACY_SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";







	private static final String MSG_NOT_ENABLED = "AI 功能未启用，请先在系统设置里配置模型";

	private static final String MSG_NO_API_KEY = "AI 的 API Key 未配置，请先在系统设置里填写";

	private static final String MSG_NO_MODEL = "没有可用的 AI 模型，请先在系统设置里添加模型";

	private final WebClient webClient;

	private final ObjectMapper objectMapper;

	private final SystemService systemService;

	private final RateLimiter rateLimiter;

	/** 单轮补全：系统提示 + 用户输入；返回 正文与用量 */
	public AiCompletion complete(AiRequest request) {
		if (request == null || (!StringUtils.hasText(request.getSystemPrompt())
				&& !StringUtils.hasText(request.getUserPrompt()))) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 请求内容为空");
		}
		List<AiChatTurn> turns = new ArrayList<>(2);
		if (StringUtils.hasText(request.getSystemPrompt())) {
			turns.add(AiChatTurn.system(request.getSystemPrompt()));
		}
		turns.add(AiChatTurn.user(request.getUserPrompt() == null ? "" : request.getUserPrompt()));
		return dispatch(turns, request.getModel(), request.getTemperature(), request.isBackground());
	}

	/** 多轮对话补全：消息顺序原样下发给模型（第一条通常是 system）；返回 正文与用量 */
	public AiCompletion completeConversation(AiConversation conversation) {
		if (conversation == null || CollectionUtils.isEmpty(conversation.getTurns())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 对话内容为空");
		}
		List<AiChatTurn> turns = conversation.getTurns().stream().filter(Objects::nonNull).toList();
		if (turns.stream().noneMatch(AiChatTurn::isUser)) {

			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 对话里没有问题");
		}
		return dispatch(turns, conversation.getModel(), conversation.getTemperature(), conversation.isBackground());
	}

	/** 要 JSON 的场景（出卷 / 改题 / 批改建议）：取回正文后把 json 围栏剥掉，只留最外层 JSON */
	public AiCompletion completeJson(AiRequest request) {
		AiCompletion completion = complete(request);
		return AiCompletion.builder().text(stripJsonFence(completion.getText())).model(completion.getModel())
				.promptTokens(completion.getPromptTokens()).completionTokens(completion.getCompletionTokens())
				.totalTokens(completion.getTotalTokens()).costMs(completion.getCostMs()).build();
	}

	/** AI 是否启用（供入口做「按钮置灰」之类的判断，不抛异常） */
	public boolean isEnabled() {
		SystemInfo.AiSetting setting = systemService.getSystemAiSetting();
		return setting != null && Boolean.TRUE.equals(setting.getEnabled());
	}

	/** 当前可用的默认模型（没配置时返回 null） */
	public String defaultModel() {
		return resolveDefaultModel(systemService.getSystemAiSetting());
	}

	/** 「现在能不能聊」的自检：口径与 #complete 完全一致，但不抛异常、不调模型 */
	public AiReadiness readiness() {
		Resolution resolution = resolve();
		if (resolution.reason() != null) {
			return AiReadiness.notReady(resolution.reason());
		}
		if (!StringUtils.hasText(resolution.model())) {
			return AiReadiness.notReady(MSG_NO_MODEL);
		}
		return AiReadiness.ready(resolution.model());
	}



	/** 两条入口的公共后半段：解析配置 → 组装 payload → 限流 → 带重试地调用 */
	private AiCompletion dispatch(List<AiChatTurn> turns, String requestedModel, Double temperature, boolean background) {
		Resolution resolution = resolve();
		if (resolution.reason() != null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, resolution.reason());
		}

		String model = StringUtils.hasText(requestedModel) ? requestedModel.trim() : resolution.model();
		if (!StringUtils.hasText(model)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, MSG_NO_MODEL);
		}
		String url = chatCompletionsUrl(resolution.setting());
		assertNotTooFrequent(background);
		return callWithRetry(url, resolution.apiKey(), buildPayload(turns, model, temperature), model);
	}

	/** 解析「现在能不能调模型」：不能调时把中文原因带出来（#readiness() 与 #dispatch 共用） */
	private Resolution resolve() {
		SystemInfo.AiSetting setting = systemService.getSystemAiSetting();
		if (setting == null || !Boolean.TRUE.equals(setting.getEnabled())) {
			return new Resolution(setting, null, null, MSG_NOT_ENABLED);
		}
		String apiKey = resolveApiKey(setting);
		if (!StringUtils.hasText(apiKey)) {
			return new Resolution(setting, null, null, MSG_NO_API_KEY);
		}
		return new Resolution(setting, apiKey, resolveDefaultModel(setting), null);
	}


	private record Resolution(SystemInfo.AiSetting setting, String apiKey, String model, String reason) {
	}

	/** 每用户窗口限流 */
	private void assertNotTooFrequent(boolean background) {
		if (background) {
			return;
		}
		SystemInfo.AiSetting setting = systemService.getSystemAiSetting();
		int perWindow = setting == null || setting.getRateLimitPerMinute() == null ? DEFAULT_RATE_LIMIT_PER_WINDOW
				: Math.max(1, setting.getRateLimitPerMinute().intValue());
		String userId = SecurityContextUtils.getUserId();
		if (!rateLimiter.tryAcquire("ai:gateway:" + userId, perWindow, RATE_WINDOW_MILLIS)) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"AI 调用过于频繁（每分钟上限 " + perWindow + " 次），请稍等几秒再试");
		}
	}

	private Map<String, Object> buildPayload(List<AiChatTurn> turns, String model, Double temperature) {
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("model", model);
		payload.put("stream", Boolean.FALSE);
		List<Map<String, String>> messages = new ArrayList<>(turns.size());
		for (AiChatTurn turn : turns) {

			messages.add(Map.of("role", turn.role(), "content", turn.content() == null ? "" : turn.content()));
		}
		payload.put("messages", messages);
		if (temperature != null) {
			payload.put("temperature", temperature);
		}
		return payload;
	}

	/** 带指数退避的调用：只对超时 / 网络 / 5xx / 429 重试，4xx 配置错误直接报中文 */
	private AiCompletion callWithRetry(String url, String apiKey, Map<String, Object> payload, String model) {
		Exception last = null;
		long start = System.currentTimeMillis();
		for (int attempt = 0; attempt <= MAX_RETRY; attempt++) {
			try {
				return doCall(url, apiKey, payload, model, start);
			}
			catch (WebClientResponseException e) {

				if (e.getStatusCode().value() >= 400 && e.getStatusCode().value() < 500
						&& e.getStatusCode().value() != 429) {
					throw new ErrorCodeException(ErrorCode.ValidationError,
							"AI 调用失败：" + describe(e) + "（请检查系统设置里的模型与 API Key）");
				}
				last = e;
			}
			catch (ErrorCodeException e) {
				throw e;
			}
			catch (Exception e) {
				last = e;
			}
			if (attempt < MAX_RETRY) {
				long wait = RETRY_BACKOFF_MILLIS << attempt;
				log.warn("AI 调用失败，{} ms 后重试（第 {} 次）：{}", wait, attempt + 1, describe(last));
				sleepQuietly(wait);
			}
		}
		throw new ErrorCodeException(ErrorCode.ValidationError,
				"AI 调用失败：" + describe(last) + "（已重试 " + MAX_RETRY + " 次）");
	}

	private AiCompletion doCall(String url, String apiKey, Map<String, Object> payload, String model, long start) {
		String body = webClient.post().uri(url).header("Authorization", "Bearer " + apiKey)
				.header("Content-Type", "application/json").bodyValue(payload).retrieve().bodyToMono(String.class)
				.block(TIMEOUT);
		long cost = System.currentTimeMillis() - start;
		if (!StringUtils.hasText(body)) {
			throw new IllegalStateException("模型返回了空响应");
		}
		JsonNode root = objectMapper.readTree(body);
		JsonNode choice = root.path("choices").path(0);
		String text = choice.path("message").path("content").asText(null);
		if (!StringUtils.hasText(text)) {
			text = choice.path("text").asText(null);
		}
		if (!StringUtils.hasText(text)) {
			throw new IllegalStateException("模型没有返回内容");
		}
		JsonNode usage = root.path("usage");
		int promptTokens = usage.path("prompt_tokens").asInt(0);
		int completionTokens = usage.path("completion_tokens").asInt(0);
		int totalTokens = usage.path("total_tokens").asInt(promptTokens + completionTokens);
		String usedModel = root.path("model").asText(model);
		log.info("AI 调用成功: model={}, promptTokens={}, completionTokens={}, costMs={}", usedModel, promptTokens,
				completionTokens, cost);
		return AiCompletion.builder().text(text).model(usedModel).promptTokens(promptTokens)
				.completionTokens(completionTokens).totalTokens(totalTokens).costMs(cost).build();
	}

	private String resolveApiKey(SystemInfo.AiSetting setting) {
		return StringUtils.hasText(setting.getApiKey()) ? setting.getApiKey().trim()
				: (StringUtils.hasText(setting.getToken()) ? setting.getToken().trim() : null);
	}

	private String resolveDefaultModel(SystemInfo.AiSetting setting) {
		if (setting == null) {
			return null;
		}
		List<String> models = setting.getModels() == null ? List.of()
				: setting.getModels().stream().filter(StringUtils::hasText).map(String::trim).distinct().toList();
		if (StringUtils.hasText(setting.getDefaultModel())) {
			return setting.getDefaultModel().trim();
		}
		return models.isEmpty() ? null : models.get(0);
	}

	/** 拉取服务商支持的模型列表（OpenAI 兼容的 `GET {base}/models`）；返回 去重排序后的模型 id；为空时抛中文错误（说明可能不是标准 OpenAI 兼容端点） */
	public java.util.List<String> listModels() {
		return listModels(null);
	}

	/** 同上，但允许用「表单里还没保存的值」先试一次 */
	public java.util.List<String> listModels(SystemInfo.AiSetting preview) {
		SystemInfo.AiSetting effective = effectiveSetting(preview);
		String apiKey = resolveApiKey(effective);
		if (!StringUtils.hasText(apiKey)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, MSG_NO_API_KEY);
		}
		String url = apiBase(effective) + "/models";
		String body;
		try {
			body = webClient.get().uri(url).header("Authorization", "Bearer " + apiKey).retrieve()
					.bodyToMono(String.class).block(LIST_MODELS_TIMEOUT);
		}
		catch (WebClientResponseException e) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "获取模型列表失败：HTTP "
					+ e.getStatusCode().value() + " " + truncate(e.getResponseBodyAsString(), 200));
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "获取模型列表失败：" + describe(e));
		}
		if (!StringUtils.hasText(body)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "获取模型列表失败：服务商返回了空响应");
		}
		JsonNode root = objectMapper.readTree(body);
		JsonNode list = root.isArray() ? root : root.path("data");
		if (!list.isArray()) {
			list = root.path("models");
		}
		java.util.LinkedHashSet<String> models = new java.util.LinkedHashSet<>();
		if (list.isArray()) {
			for (JsonNode node : list) {

				String id = node.isTextual() ? node.asText() : node.path("id").asText(null);
				if (!StringUtils.hasText(id)) {
					id = node.path("name").asText(null);
				}
				if (StringUtils.hasText(id)) {
					models.add(id.trim());
				}
			}
		}
		if (models.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"服务商没有返回任何模型，可能不是标准 OpenAI 兼容端点（需要支持 GET /models）");
		}
		java.util.List<String> result = new java.util.ArrayList<>(models);
		java.util.Collections.sort(result);
		return result;
	}

	/** 存库配置 + 表单预览值合成一份「这次请求用哪套配置」；preview 只认 baseUrl / apiKey */
	private SystemInfo.AiSetting effectiveSetting(SystemInfo.AiSetting preview) {
		SystemInfo.AiSetting stored = systemService.getSystemAiSetting();
		SystemInfo.AiSetting effective = new SystemInfo.AiSetting();
		if (stored != null) {
			effective.setEnabled(stored.getEnabled());
			effective.setBaseUrl(stored.getBaseUrl());
			effective.setApiKey(stored.getApiKey());
			effective.setToken(stored.getToken());
			effective.setModels(stored.getModels());
			effective.setDefaultModel(stored.getDefaultModel());
		}
		if (preview != null) {
			if (StringUtils.hasText(preview.getBaseUrl())) {
				effective.setBaseUrl(preview.getBaseUrl().trim());
			}

			if (StringUtils.hasText(preview.getApiKey())) {
				effective.setApiKey(preview.getApiKey().trim());
			}
		}
		return effective;
	}

	/** baseUrl 归一化：补默认值、校验协议、去掉尾部斜杠与误填的 /chat/completions */
	private String apiBase(SystemInfo.AiSetting setting) {
		String baseUrl = setting.getBaseUrl();
		if (!StringUtils.hasText(baseUrl)) {
			baseUrl = !StringUtils.hasText(setting.getApiKey()) && StringUtils.hasText(setting.getToken())
					? LEGACY_SILICONFLOW_BASE_URL : DEFAULT_BASE_URL;
		}
		baseUrl = baseUrl.trim();
		if (!baseUrl.startsWith("https://") && !baseUrl.startsWith("http://")) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "模型服务地址必须以 http:// 或 https:// 开头");
		}
		baseUrl = baseUrl.replaceAll("/+$", "");
		if (baseUrl.endsWith("/chat/completions")) {
			baseUrl = baseUrl.substring(0, baseUrl.length() - "/chat/completions".length());
		}
		return baseUrl;
	}

	/** 与 OpenAiCompatibleChatServiceImpl 同一套 baseUrl 规则（含旧 SiliconFlow token 的兜底） */
	private String chatCompletionsUrl(SystemInfo.AiSetting setting) {
		return apiBase(setting) + "/chat/completions";
	}

	/** 剥掉 ```json 围栏与前后废话，只留最外层 JSON */
	static String stripJsonFence(String text) {
		if (!StringUtils.hasText(text)) {
			throw new IllegalStateException("模型没有返回内容");
		}
		String value = text.trim();
		if (value.startsWith("```")) {
			int firstLineEnd = value.indexOf('\n');
			value = firstLineEnd < 0 ? value.substring(3) : value.substring(firstLineEnd + 1);
			int fence = value.lastIndexOf("```");
			if (fence >= 0) {
				value = value.substring(0, fence);
			}
			value = value.trim();
		}
		int objectStart = value.indexOf('{');
		int arrayStart = value.indexOf('[');
		int start = objectStart < 0 ? arrayStart : (arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart));
		int end = Math.max(value.lastIndexOf('}'), value.lastIndexOf(']'));
		if (start < 0 || end <= start) {
			throw new IllegalStateException("模型返回的不是 JSON：" + truncate(value, 120));
		}
		return value.substring(start, end + 1);
	}

	private String describe(Exception e) {
		if (e == null) {
			return "未知错误";
		}
		if (e instanceof WebClientResponseException response) {
			return "HTTP " + response.getStatusCode().value() + " " + truncate(response.getResponseBodyAsString(), 200);
		}
		String message = e.getMessage();
		if (message != null && message.contains("Timeout")) {
			return "调用超时（" + TIMEOUT.toSeconds() + " 秒）";
		}
		return StringUtils.hasText(message) ? truncate(message, 200) : e.getClass().getSimpleName();
	}

	private static String truncate(String text, int max) {
		if (text == null) {
			return "";
		}
		String oneLine = text.replaceAll("\\s+", " ").trim();
		return oneLine.length() <= max ? oneLine : oneLine.substring(0, max) + "…";
	}

	private void sleepQuietly(long millis) {
		try {
			Thread.sleep(millis);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

}
