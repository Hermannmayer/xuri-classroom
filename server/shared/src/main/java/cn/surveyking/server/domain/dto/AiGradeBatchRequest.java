package cn.surveyking.server.domain.dto;

import lombok.Data;









@Data
public class AiGradeBatchRequest {


	private String projectId;


	private String classId;


	private Integer maxAnswers;


	private Double minConfidence;


	private Boolean dryRun;

}
