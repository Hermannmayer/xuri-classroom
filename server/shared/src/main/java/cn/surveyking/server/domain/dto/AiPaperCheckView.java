package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 试卷质检结果（{@code GET /api/ai/paper/job/{jobId}} 的 result）。
 *
 * <p>问题分两档：{@code blocker} 会让考试出事故（没分值、没答案、重复题），
 * {@code warning} 属于质量建议（难度偏斜、考点覆盖不均）。分数只做粗排，不做绝对判断。
 *
 * @author ai-actions
 */
@Data
public class AiPaperCheckView {

	/** 0~100 的粗排分：100 - 扣分，仅用于「一眼看个大概」 */
	private Integer score;

	/** 一句话结论 */
	private String summary;

	/** 模型给的改进建议（aiSummary=true 时才有） */
	private String advice;

	private List<Issue> issues = new ArrayList<>();

	@Data
	public static class Issue {

		/** no_score / no_answer / duplicate / difficulty / coverage / format / type_mix */
		private String kind;

		/** blocker / warning */
		private String severity;

		/** 涉及的题目 id */
		private List<String> questionIds = new ArrayList<>();

		/** 中文说明 */
		private String message;

		/** 处理建议 */
		private String suggestion;

	}

}
