package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * AI 改题请求（{@code POST /api/ai/question/rewrite}）。
 *
 * <p>两种用法都支持：
 * <ul>
 * <li>只传 {@link #projectId} + {@link #questionId}：题目从<b>已保存</b>的项目 schema 里取；</li>
 * <li>额外传 {@link #title}（可带 {@link #type}）：直接用传进来的题干改写，编辑器有未保存改动也能用，
 * 不必强制先保存。</li>
 * </ul>
 *
 * @author p4-backend
 */
@Data
public class AiQuestionRewriteRequest {

	private String projectId;

	/** 题目 id（从项目 schema 里取题干时必填） */
	private String questionId;

	/** 改写风格：clear（更清楚）/ neutral（中性）/ shorter（更短），可空，默认 clear */
	private String style;

	/** 直接给出的题干（纯文本或 HTML），传了就不再读库 */
	private String title;

	/** 题型名（可空，只用于给模型补上下文） */
	private String type;

}
