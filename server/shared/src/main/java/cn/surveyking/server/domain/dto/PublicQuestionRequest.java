package cn.surveyking.server.domain.dto;

import lombok.Data;


@Data
public class PublicQuestionRequest {

	private String id;

	private String answerId;

	private String questionId;

	private Boolean preview;

}
