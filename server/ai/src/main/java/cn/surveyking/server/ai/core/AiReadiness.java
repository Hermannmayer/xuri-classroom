package cn.surveyking.server.ai.core;

import lombok.Builder;
import lombok.Getter;
import org.springframework.util.StringUtils;

/**
 * 「现在能不能调模型」的自检结果。
 *
 * <p>为什么要有它：侧栏在开聊之前就得知道该显示聊天框还是「还没配模型，去系统设置」的引导，
 * 而不是等用户打完一段话、点了发送、拿到 400 才知道。判断口径与 {@link AiGateway#complete}
 * 完全一致（同一份 {@code AiSetting}、同一个默认模型解析），避免出现「界面说能用、一发就报错」。
 *
 * @author ai-sidebar
 */
@Getter
@Builder
public class AiReadiness {

	/** 能不能直接聊 */
	private final boolean ready;

	/** 不能聊时的中文原因（可直接展示给用户）；能聊时为 null */
	private final String reason;

	/** 当前默认模型；没配时为 null */
	private final String model;

	public static AiReadiness ready(String model) {
		return AiReadiness.builder().ready(true).model(model).build();
	}

	public static AiReadiness notReady(String reason) {
		return AiReadiness.builder().ready(false).reason(StringUtils.hasText(reason) ? reason : "AI 暂不可用").build();
	}

}
