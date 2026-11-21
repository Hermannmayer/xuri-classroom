package cn.surveyking.server.domain.dto;

import lombok.Data;









@Data
public class AiPracticeRecommendRequest {


	private String sourceProjectId;


	private String classId;


	private String repoId;


	private Integer questionCount;


	private String targetProjectId;

}
