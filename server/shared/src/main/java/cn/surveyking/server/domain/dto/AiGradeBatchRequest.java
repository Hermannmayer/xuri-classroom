package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 批量 AI 批改请求（{@code POST /api/ai/grade/batch}）。
 *
 * <p>范围口径：只处理「正式交卷且批改状态为 pending」的答卷里<b>还没给分</b>的主观题，
 * 已经有分的题一律跳过（不覆盖老师的手工分）。
 *
 * @author ai-actions
 */
@Data
public class AiGradeBatchRequest {

	/** 项目 id（必填） */
	private String projectId;

	/** 班级 id（可空：空表示整份试卷的所有待批答卷） */
	private String classId;

	/** 最多处理多少份答卷（默认 30，上限 100） */
	private Integer maxAnswers;

	/** 低于该置信度的结果仍然写入，但会列进「需复核」（默认 0.6） */
	private Double minConfidence;

	/** true 时只统计不写库（给老师看「会批多少」） */
	private Boolean dryRun;

}
