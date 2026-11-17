package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 错题重练推荐请求（{@code POST /api/ai/practice/recommend}）。
 *
 * <p>输入是「某场考试 + 某个班」，输出是「按错得最多的考点，从题库里再抽一组题」。
 * 数据口径只用报表统计（每题的得分率），<b>不把学员原始答案发给模型</b>。
 *
 * @author ai-actions
 */
@Data
public class AiPracticeRecommendRequest {

	/** 来源考试（必填）：用来算哪些题错得多 */
	private String sourceProjectId;

	/** 班级（可空：空表示按整场考试算） */
	private String classId;

	/** 从哪个题库抽题（必填） */
	private String repoId;

	/** 抽多少题（默认 20，上限 50） */
	private Integer questionCount;

	/** 追加到哪个项目（可空：空表示只预览） */
	private String targetProjectId;

}
