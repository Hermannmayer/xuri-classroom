package cn.surveyking.server.domain.dto;

import lombok.Data;


@Data
public class PublicQuestionOutline {

	private String id;

	private SurveySchema.QuestionType type;

	private Integer number;

	private Boolean required;

}
