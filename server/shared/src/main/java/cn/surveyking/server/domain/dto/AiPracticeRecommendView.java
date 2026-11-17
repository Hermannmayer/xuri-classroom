package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 错题重练推荐结果（{@code GET /api/ai/paper/job/{jobId}} 的 result）。
 *
 * @author ai-actions
 */
@Data
public class AiPracticeRecommendView {

	/** 推荐题目（已按题库原样带好 id / 答案 / 分值） */
	private List<SurveySchema> questions = new ArrayList<>();

	/** 本次针对的薄弱考点（按得分率从低到高） */
	private List<Focus> focus = new ArrayList<>();

	/** 中文摘要 */
	private String summary;

	private AiPaperJobView.Stats stats;

	@Data
	public static class Focus {

		/** 考点 / 章节名 */
		private String point;

		/** 0~1 的得分率（越低越需要重练） */
		private Double rate;

		/** 涉及的原卷题数 */
		private Integer questions;

		/** 该考点推荐了几道重练题 */
		private Integer recommended;

	}

}
