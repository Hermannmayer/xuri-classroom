package cn.surveyking.server.ai.domain;

import lombok.Data;

/**
 * 侧栏 AI 助手的对话回复（{@code POST /api/ai/chat} 的返回体）。
 *
 * <p>为什么把 token 用量也回给前端：侧栏要显示「这一问花了多少额度」，老师据此判断
 * 是不是问得太碎；也省得前端再查一次 {@code /api/ai/usage/today}。
 *
 * @author ai-sidebar
 */
@Data
public class AiChatReply {

	/** 助手正文（已过 {@code AiContentGuard#checkChatReply}，可直接按纯文本渲染） */
	private String reply;

	/** 实际使用的模型 */
	private String model;

	private Integer promptTokens;

	private Integer completionTokens;

	private Integer totalTokens;

	/** 本次调用耗时（含重试），毫秒 */
	private Long costMs;

	/**
	 * 后端实际带给模型的上下文摘要，例如「试卷《2026 春季考试》· 第 3 题」。
	 * <p>给前端显示成「已带上：…」，让用户知道 AI 到底看到了什么；没带上下文时为 null。
	 */
	private String contextLabel;

}
