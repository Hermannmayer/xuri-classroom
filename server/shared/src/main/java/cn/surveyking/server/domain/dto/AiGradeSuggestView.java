package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * AI 批改建议结果。
 *
 * <p>{@link #score} 只是建议分，不会写进 {@code t_answer}；老师采纳后才由批改接口落库。
 *
 * @author p4-backend
 */
@Data
public class AiGradeSuggestView {

	/** 建议分（已夹到 0 ~ 该题满分之间） */
	private Double score;

	/** 置信度 0~1，偏低时前端可以提示「建议人工复核」 */
	private Double confidence;

	/** 采分点命中情况 */
	private List<Point> points = new ArrayList<>();

	/** 给老师看的理由 */
	private String reason;

	@Data
	public static class Point {

		/** 采分点 */
		private String point;

		/** 学员答案是否覆盖了这个采分点 */
		private Boolean hit;

	}

}
