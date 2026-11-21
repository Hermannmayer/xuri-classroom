package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class RepoQuestionTypeTotalView {




	private SurveySchema.QuestionType questionType;




	private Long total;

}
