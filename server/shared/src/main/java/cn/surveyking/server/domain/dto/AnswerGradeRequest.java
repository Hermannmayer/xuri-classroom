package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 主观题人工批改请求。
 *
 * <p>一次请求可以给多道主观题打分；客观题（examAnswerMode != manual）传分会被拒绝（400），
 * 机器判出来的分不允许被覆盖。
 *
 * @author grading
 */
@Data
public class AnswerGradeRequest {

	/**
	 * 答卷 id（t_answer.id）
	 */
	private String answerId;

	/**
	 * 逐题打分；撤销批改（/api/answer/grade/reset）时可以不传
	 */
	private List<Item> items;

	/**
	 * 是否「保存并完成批改」。
	 * <p>true：本次保存后若所有 manual 题都已给分，答卷状态置 graded；false：只暂存批改进度，
	 * 状态保持 pending（老师可以分几次批完一整卷）。
	 */
	private Boolean submit;

	/**
	 * 撤销批改的题目 id 列表，只有 /api/answer/grade/reset 用；为空表示整卷清空人工分。
	 */
	private List<String> questionIds;

	/**
	 * 单题打分
	 */
	@Data
	public static class Item {

		/** 题目 id */
		private String questionId;

		/** 人工分，必须落在 0 ~ 该题 examScore 之间 */
		private Double score;

		/** 评语（可空），保存时按最后一次传入的值覆盖，传空串即清空 */
		private String comment;

		/**
		 * 分数来源：不传按 manual 处理；AI 批量批改传 {@code ai}。
		 * <p>只做审计标记，不影响分数本身——老师复核时直接把分改掉，来源会回到 manual。
		 */
		private String source;

	}

}
