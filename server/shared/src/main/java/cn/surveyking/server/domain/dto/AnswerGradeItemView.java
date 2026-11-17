package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 批改抽屉里的「一道题」视图。
 *
 * <p>客观题与主观题都会出现在列表里（老师需要看整卷），但只有 {@link #editable} = true 的题
 * 才允许改分。
 *
 * @author grading
 */
@Data
public class AnswerGradeItemView {

	/** 题目 id */
	private String questionId;

	/** 题型（SurveySchema.QuestionType 枚举名） */
	private String type;

	/** 题干 */
	private String title;

	/** 题号，从 1 开始（只算会存答案的题） */
	private Integer number;

	/** 题干含 HTML（Word 导入的图片等），前端按富文本消毒后渲染 */
	private Boolean richTitle;

	/** 该题满分（attribute.examScore），没配置分值时为空 */
	private Double maxScore;

	/**
	 * 当前得分：manual 题是老师给的分（还没批改时为空，不能当成 0 分展示）；
	 * 其余题是机器分。
	 */
	private Double score;

	/** 人工评语 */
	private String comment;

	/** 是否允许人工给分（只有 examAnswerMode=manual 的题为 true） */
	private Boolean editable;

	/** 学员答案原始值（与 t_answer.answer 里该题的值一致） */
	private Object answer;

	/** 参考答案：只有请求带 includeCorrectAnswer=true 时才下发 */
	private String correctAnswer;

	/** 答案解析：只有请求带 includeCorrectAnswer=true 时才下发 */
	private String analysis;

}
