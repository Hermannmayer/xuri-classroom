package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * AI 批改建议请求（{@code POST /api/ai/grade/suggest}）。
 *
 * <p><b>只给建议，不落分</b>：老师点「采纳」才会走已有的 {@code POST /api/answer/grade}。
 *
 * @author p4-backend
 */
@Data
public class AiGradeSuggestRequest {

	private String answerId;

	private String questionId;

}
