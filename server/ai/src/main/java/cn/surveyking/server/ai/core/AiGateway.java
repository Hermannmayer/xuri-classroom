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
 * <p>两条入口共用同一套治理（重试 / 限流 / 配置校验只写一份）：
 * <ul>
 * <li>{@link #complete(AiRequest)}：单轮的「系统提示 + 用户输入」，出卷 / 改题 / 批改 / 学情在用；</li>
 * <li>{@link #completeConversation(AiConversation)}：多轮对话，侧栏 AI 助手用。</li>
 * </ul>
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

	/** 每用户窗口内允许的调用次数默认值（系统设置里没填时用它） */
	private static final int DEFAULT_RATE_LIMIT_PER_WINDOW = 10;

	/** 限流窗口 */
	private static final long RATE_WINDOW_MILLIS = 60_000L;

	private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";

	private static final String LEGACY_SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";

	/**
	 * 三种「配了但用不了」的中文原因。
	 *
	 * <p>抽成常量是因为有两个出口要说同一句话：真正调用时抛的 400（{@link #dispatch}），
	 * 和侧栏开聊前查的 {@link #readiness()}。两处各写一遍迟早会出现「界面说能用、一发就报错」。
	 */
	private static final String MSG_NOT_ENABLED = "AI 功能未启用，请先在系统设置里配置模型";

	private static final String MSG_NO_API_KEY = "AI 的 API Key 未配置，请先在系统设置里填写";

	private static final String MSG_NO_MODEL = "没有可用的 AI 模型，请先在系统设置里添加模型";

	private final WebClient webClient;

	private final ObjectMapper objectMapper;

	private final SystemService systemService;

	private final RateLimiter rateLimiter;

	/**
	 * 单轮补全：系统提示 + 用户输入。
	 * @param request 系统提示 + 用户输入 + 可选模型/温度
	 * @return 正文与用量
	 * @throws ErrorCodeException AI 未启用、key/模型没配、被限流或调用最终失败（消息都是中文，可直接弹给老师）
	 */
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

	/**
	 * 多轮对话补全：消息顺序原样下发给模型（第一条通常是 system）。
	 * @param conversation 消息列表 + 可选模型/温度
	 * @return 正文与用量
	 * @throws ErrorCodeException 与 {@link #complete(AiRequest)} 同一套原因（配置 / 限流 / 调用失败）
	 */
	public AiCompletion completeConversation(AiConversation conversation) {
		if (conversation == null || CollectionUtils.isEmpty(conversation.getTurns())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 对话内容为空");
		}
		List<AiChatTurn> turns = conversation.getTurns().stream().filter(Objects::nonNull).toList();
		if (turns.stream().noneMatch(AiChatTurn::isUser)) {
			// 只有 system/assistant 的请求一定是调用方拼错了，早点报错比让模型自问自答便宜
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 对话里没有问题");
		}
		return dispatch(turns, conversation.getModel(), conversation.getTemperature(), conversation.isBackground());
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

	/**
	 * 「现在能不能聊」的自检：口径与 {@link #complete} 完全一致，但<b>不抛异常、不调模型</b>。
	 *
	 * <p>侧栏打开时先问一次：不能聊就直接显示引导（并给出原因），而不是让用户打完字、点了发送才看到 400。
	 */
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

	/* ====== 内部实现 ====== */

	/** 两条入口的公共后半段：解析配置 → 组装 payload → 限流 → 带重试地调用 */
	private AiCompletion dispatch(List<AiChatTurn> turns, String requestedModel, Double temperature, boolean background) {
		Resolution resolution = resolve();
		if (resolution.reason() != null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, resolution.reason());
		}
		// 请求显式指定了模型就尊重它（即便系统设置里没配默认模型）；否则用默认模型
		String model = StringUtils.hasText(requestedModel) ? requestedModel.trim() : resolution.model();
		if (!StringUtils.hasText(model)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, MSG_NO_MODEL);
		}
		String url = chatCompletionsUrl(resolution.setting());
		assertNotTooFrequent(background);
		return callWithRetry(url, resolution.apiKey(), buildPayload(turns, model, temperature), model);
	}

	/** 解析「现在能不能调模型」：不能调时把中文原因带出来（{@link #readiness()} 与 {@link #dispatch} 共用） */
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

	/** 一次解析的结果：reason 非空表示不可用（此时其它字段可能为空） */
	private record Resolution(SystemInfo.AiSetting setting, String apiKey, String model, String reason) {
	}

	/**
	 * 每用户窗口限流。
	 *
	 * <p>两个例外必须说清楚：
	 * <ul>
	 * <li><b>后台任务不限流</b>：批量批改 / 组卷 / 题库体检本身就是「一次请求里连调几十次模型」，
	 * 按人限流会把自己卡死在第三次；它们的成本由每日 token 限额兜底、并发由 {@code AiJobService} 兜底。</li>
	 * <li><b>频率可配</b>：默认 10 次/分钟，管理员在系统设置里能调（大校自建模型时想放开）。</li>
	 * </ul>
	 */
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
			// Map.of 不接受 null 值：content 为空时补空串，别让组装 payload 变成 NPE
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
