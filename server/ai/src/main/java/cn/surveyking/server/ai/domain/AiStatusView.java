package cn.surveyking.server.ai.domain;

import lombok.Data;

/**
 * AI 可用性自检（{@code GET /api/ai/status}）。
 *
 * <p>侧栏打开时先问一次：不能聊就直接显示引导，而不是让用户打完字、点了发送才看到 400。
 * 判断口径与真正调用完全一致（同一个 {@code AiGateway#readiness()}）。
 *
 * @author ai-sidebar
 */
@Data
public class AiStatusView {

	/** 能不能直接聊 */
	private Boolean ready;

	/** 不能聊时的中文原因（可直接展示，例如「AI 的 API Key 未配置，请先在系统设置里填写」） */
	private String reason;

	/** 当前默认模型（ready=true 时有值） */
	private String model;

}
