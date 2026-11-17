package cn.surveyking.server.ai.core;

import lombok.Builder;
import lombok.Getter;

/**
 * 一次非流式补全的结果。
 *
 * <p>token 数与耗时一起带出来，是为了让调用方（各场景）能原样写进 {@code t_ai_usage}：
 * 记账要在同一个地方发生，不能靠重新估算。
 *
 * @author p4-backend
 */
@Getter
@Builder
public class AiCompletion {

	/** 模型输出正文 */
	private final String text;

	/** 实际使用的模型 */
	private final String model;

	private final int promptTokens;

	private final int completionTokens;

	private final int totalTokens;

	/** 本次调用耗时（含重试），毫秒 */
	private final long costMs;

}
