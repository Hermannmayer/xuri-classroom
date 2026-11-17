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

/**
 * AI 统一调用入口（非流式）。
 *
 * <p>为什么在现有的 {@code OpenAiCompatibleChatServiceImpl} 之外再包一层，而不是改造它：
 * <ul>
 * <li>那条路径是<b>流式 SSE</b>，给「答题解析」这种边说边看的界面用的；四个内嵌场景要的是
 * 「一次拿全结果再校验」，流式拿不到可校验的完整结构；</li>
 * <li>这里要加的是<b>超时 / 重试 / 限流</b>三件治理能力，塞进流式实现会把 {@code Flux} 链路搅浑，
 * 也会改到学员侧已有的解析功能；</li>
 * <li>模型配置（baseUrl / apiKey / models / defaultModel）仍然读同一个 {@code AiSetting}，
 * 所以「每校自配 key」不需要任何迁移。</li>
 * </ul>
 *
 * <p>三条治理口径：
 * <ol>
 * <li><b>超时 120 秒</b>：出卷可能要 30~90 秒，给到 120 秒；再长就是模型侧卡住，重试更划算；</li>
 * <li><b>失败重试 2 次</b>（1s / 2s 指数退避）：只对超时、网络错误、5xx、429 重试；
 * 4xx（key 错、模型名错、额度耗尽）重试没有意义，直接报中文错；</li>
 * <li><b>每用户限流</b>：进程内滑动窗口，默认 10 次/分钟。限额（每日 token）是另一层，
 * 见 {@code AiUsageService}——这里挡的是「手抖连点」，那边挡的是「账单」。</li>
 * </ol>
 *
 * @author p4-backend
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiGateway {

	/** 单次调用超时：出卷 30~90 秒是常态，给到 120 秒 */
	public static final Duration TIMEOUT = Duration.ofSeconds(120);

	/** 失败重试次数（不含首次） */
	private static final int MAX_RETRY = 2;

	/** 首次重试等待；之后翻倍（1s → 2s） */
	private static final long RETRY_BACKOFF_MILLIS = 1000L;

	/** 每用户窗口内允许的调用次数 */
	private static final int RATE_LIMIT_PER_WINDOW = 10;

	/** 限流窗口 */
	private static final long RATE_WINDOW_MILLIS = 60_000L;

	private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";

	private static final String LEGACY_SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";

	private final WebClient webClient;

	private final ObjectMapper objectMapper;

	private final SystemService systemService;

	private final RateLimiter rateLimiter;

	/**
	 * 非流式补全。
	 *
	 * @param request 系统提示 + 用户输入 + 可选模型/温度
	 * @return 正文与用量
	 * @throws ErrorCodeException AI 未启用、key/模型没配、被限流或调用最终失败（消息都是中文，可直接弹给老师）
	 */
	public AiCompletion complete(AiRequest request) {
		if (request == null || (!StringUtils.hasText(request.getSystemPrompt())
				&& !StringUtils.hasText(request.getUserPrompt()))) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 请求内容为空");
		}
		SystemInfo.AiSetting setting = systemService.getSystemAiSetting();
		if (setting == null || !Boolean.TRUE.equals(setting.getEnabled())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 功能未启用，请先在系统设置里配置模型");
		}
		String apiKey = resolveApiKey(setting);
		if (!StringUtils.hasText(apiKey)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 的 API Key 未配置，请先在系统设置里填写");
		}
		String model = StringUtils.hasText(request.getModel()) ? request.getModel().trim() : resolveDefaultModel(setting);
		if (!StringUtils.hasText(model)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "没有可用的 AI 模型，请先在系统设置里添加模型");
		}
		String url = chatCompletionsUrl(setting);
		assertNotTooFrequent();

		Map<String, Object> payload = buildPayload(request, model);
		Exception last = null;
		long start = System.currentTimeMillis();
		for (int attempt = 0; attempt <= MAX_RETRY; attempt++) {
			try {
				return doCall(url, apiKey, payload, model, start);
			}
			catch (WebClientResponseException e) {
				// 4xx（除 429）是配置问题，重试只会再错一次并把老师的等待时间翻倍
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

	/**
	 * 要 JSON 的场景（出卷 / 改题 / 批改建议）：取回正文后把 json 围栏剥掉，只留最外层 JSON。
	 *
	 * <p>返回的仍是 {@link AiCompletion}（正文已换成纯净 JSON），这样调用方还能拿到 token 用量去记账——
	 * 只返回字符串会让记账丢掉用量。
	 *
	 * <p>不依赖 provider 的 {@code response_format}：不是所有 OpenAI 兼容端点都支持它，
	 * 而「提示词里要求只输出 JSON」+ 这里剥围栏，在所有端点上都成立。
	 */
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

	/* ====== 内部实现 ====== */

	private void assertNotTooFrequent() {
		String userId = SecurityContextUtils.getUserId();
		if (!rateLimiter.tryAcquire("ai:gateway:" + userId, RATE_LIMIT_PER_WINDOW, RATE_WINDOW_MILLIS)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 调用过于频繁，请稍等几秒再试");
		}
	}

	private Map<String, Object> buildPayload(AiRequest request, String model) {
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("model", model);
		payload.put("stream", Boolean.FALSE);
		List<Map<String, String>> messages = new ArrayList<>(2);
		if (StringUtils.hasText(request.getSystemPrompt())) {
			messages.add(Map.of("role", "system", "content", request.getSystemPrompt()));
		}
		messages.add(Map.of("role", "user", "content", request.getUserPrompt() == null ? "" : request.getUserPrompt()));
		payload.put("messages", messages);
		if (request.getTemperature() != null) {
			payload.put("temperature", request.getTemperature());
		}
		return payload;
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

	/** 与 {@code OpenAiCompatibleChatServiceImpl} 同一套 baseUrl 规则（含旧 SiliconFlow token 的兜底） */
	private String chatCompletionsUrl(SystemInfo.AiSetting setting) {
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
		return baseUrl.endsWith("/chat/completions") ? baseUrl : baseUrl + "/chat/completions";
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
