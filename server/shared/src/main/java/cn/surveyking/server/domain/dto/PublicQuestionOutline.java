package cn.surveyking.server.domain.dto;

import lombok.Data;

/** 逐题下发首屏使用的最小大纲项，不包含题干、选项、题目属性或子节点。 */
@Data
public class PublicQuestionOutline {

	private String id;

	private SurveySchema.QuestionType type;

	private Integer number;

	private Boolean required;

}
