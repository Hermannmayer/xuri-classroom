package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;





@Data
public class AnswerRequest {

	private String id;




	private String queryId;

	private String projectId;

	private LinkedHashMap<String, Object> answer;

	private LinkedHashMap<String, Object> tempAnswer;

	private SurveySchema survey;

	private AnswerMetaInfo metaInfo;




	private Integer tempSave;




	private Boolean freshAttempt;




	private String examExerciseType;


	private String repoId;


	private String classToken;








	private String answererName;

	private AnswerExamInfo examInfo;




	private List<String> ids;

	private String whitelistName;




	private String createBy;




	private String updateBy;

}
