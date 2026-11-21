package cn.surveyking.server.domain.dto;

import lombok.Data;













@Data
public class AiQuestionRewriteRequest {

	private String projectId;


	private String questionId;


	private String style;


	private String title;


	private String type;

}
