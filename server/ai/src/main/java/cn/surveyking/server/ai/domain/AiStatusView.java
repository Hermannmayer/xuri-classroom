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

	/**
	 * 系统设置里 AI 总开关是否打开。
	 *
	 * <p>与 {@link #ready} 的区别很关键：{@code enabled=false} 时前端连入口都不该显示
	 * （悬浮按钮直接不出现）；{@code enabled=true} 但 {@code ready=false} 时入口要显示，
	 * 点开告诉管理员「还差哪一步」。
	 */
	private Boolean enabled;

	/** 能不能直接聊 */
	private Boolean ready;

	/** 不能聊时的中文原因（可直接展示，例如「AI 的 API Key 未配置，请先在系统设置里填写」） */
	private String reason;

	/** 当前默认模型（ready=true 时有值） */
	private String model;

}
