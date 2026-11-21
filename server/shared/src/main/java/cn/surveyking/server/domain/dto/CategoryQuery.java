package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class CategoryQuery {

	private String name;

	private Integer shared = 1;

	SurveySchema.QuestionType questionType = SurveySchema.QuestionType.Survey;

}
