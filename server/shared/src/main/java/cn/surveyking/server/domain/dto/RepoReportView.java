package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 题库统计：题量与题型/难度分布、练习概况、薄弱题。
 *
 * <p>和考试报表的区别：练习没有「整卷分数」的概念（可以只练 5 道），所以没有分数段、区分度；
 * 这里看的是「这个库被练了多少次、哪些题最容易被做错」。
 */
@Data
public class RepoReportView {

	private String repoId;

	private String repoName;

	/** 题量（含所有题型） */
	private int total;

	/** 题型分布：Radio / Checkbox / … */
	private Map<String, Integer> byType = new LinkedHashMap<>();

	/** 难度分布（未标注的记为「未标注」） */
	private Map<String, Integer> byDifficulty = new LinkedHashMap<>();

	private Practice practice = new Practice();

	/** 薄弱题：练习正确率最低的若干题 */
	private List<WeakQuestion> weakQuestions = List.of();

	/** 练习概况 */
	@Data
	public static class Practice {

		/** 练习次数（练习答卷数） */
		private int count;

		/** 练习人数（按账号去重） */
		private int students;

		/** 平均得分（没有判分的练习为空） */
		private Double avgScore;

	}

	/** 单题练习表现 */
	@Data
	public static class WeakQuestion {

		private String questionId;

		private String title;

		/** 作答人数 */
		private int answered;

		/** 答对人数 */
		private int correct;

		/** 正确率（0-100），没有判分为空 */
		private Double rate;

	}

}
