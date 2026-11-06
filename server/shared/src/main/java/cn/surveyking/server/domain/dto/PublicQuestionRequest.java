package cn.surveyking.server.domain.dto;

import lombok.Data;

/** 单题读取请求；projectId 用于访问校验，answerId 用于随机卷快照定位。 */
@Data
public class PublicQuestionRequest {

	private String id;

	private String answerId;

	private String questionId;

}
