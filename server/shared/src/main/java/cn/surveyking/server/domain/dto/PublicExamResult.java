package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;

/**
 * @author javahuang
 * @date 2022/7/22
 */
@Data
public class PublicExamResult {

	private String name;

	/**
	 * 答题人姓名（交卷时快照）。
	 * <p>登录用户由后端用 t_user.name 补齐；匿名答卷靠答题页的姓名输入框带上。
	 * 没填且不是登录用户时为空，前端显示「未填写」。
	 */
	private String answererName;

	private SurveySchema schema;

	/**
	 * 考试分数
	 */
	private Double examScore;

	/**
	 * 答题信息
	 */
	private AnswerMetaInfo metaInfo;

	/**
	 * 考试信息
	 */
	private AnswerExamInfo examInfo;

	/**
	 * 答案
	 */
	private LinkedHashMap answer;

	/**
	 * 排名信息
	 */
	private Integer rank;

}
