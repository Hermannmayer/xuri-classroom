package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;





@Data
public class PickRepoQuestionRequest {




	private String repoId;




	private List<SurveySchema.QuestionType> types = new ArrayList<>();




	private List<String> tags = new ArrayList<>();




	private Integer questionsNum;




	private Double examScore;

}
