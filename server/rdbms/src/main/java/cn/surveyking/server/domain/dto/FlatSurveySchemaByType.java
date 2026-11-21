package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;





@Data
public class FlatSurveySchemaByType {




	List<SurveySchema> schemaDataTypes;




	List<SurveySchema> userQuestions;




	List<SurveySchema> deptQuestions;




	List<SurveySchema> fileQuestions;

}
