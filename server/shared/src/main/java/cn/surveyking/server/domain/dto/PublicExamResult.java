package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;





@Data
public class PublicExamResult {

	private String name;






	private String answererName;

	private SurveySchema schema;




	private Double examScore;




	private AnswerMetaInfo metaInfo;




	private AnswerExamInfo examInfo;




	private LinkedHashMap answer;




	private Integer rank;

}
