package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 批量 AI 批改结果（{@code GET /api/ai/grade/job/{jobId}} 的 result）。
 *
 * <p>统计口径与页面上的「待批改」一致：{@link #answers} 是本次处理过的答卷数，
 * {@link #graded} 是真正写入的分值条数；{@link #lowConfidence} 是置信度低、必须人看一眼的条目。
 *
 * @author ai-actions
 */
@Data
public class AiGradeBatchView {

	/** 处理过的答卷数 */
	private Integer answers;

	/** 处理过的题目条数（答卷 × 题） */
	private Integer items;

	/** 实际写入的分数条数 */
	private Integer graded;

	/** 跳过条数（没参考答案、没有分值、不是主观题、已经有分…） */
	private Integer skipped;

	/** 失败条数（模型报错、内容校验拒收） */
	private Integer failed;

	/** 低置信度条目：建议人工复核 */
	private List<Low> lowConfidence = new ArrayList<>();

	/** 中文摘要，直接显示在对话里 */
	private String summary;

	/** 撤销令牌（24 小时内有效）；dryRun 时为 null */
	private String undoToken;

	/** 本次批改涉及的答卷 id（前端「去查看」用） */
	private List<String> answerIds = new ArrayList<>();

	@Data
	public static class Low {

		private String answerId;

		private String answererName;

		private String questionId;

		private String questionTitle;

		private Double score;

		private Double maxScore;

		private Double confidence;

		private String reason;

	}

}
