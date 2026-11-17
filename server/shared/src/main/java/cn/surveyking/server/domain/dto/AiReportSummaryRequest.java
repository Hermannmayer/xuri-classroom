package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * AI 学情总结请求（{@code POST /api/ai/report/summary}）。
 *
 * <p><b>只吃统计数字</b>（{@code GET /api/report/{shortId}} 的结果），不把学员原始答卷发给模型：
 * 隐私与成本双赢，也避免 prompt 里出现学生姓名。
 *
 * @author p4-backend
 */
@Data
public class AiReportSummaryRequest {

	private String projectId;

	/** 班级 id（可空：空表示整场考试） */
	private String classId;

}
