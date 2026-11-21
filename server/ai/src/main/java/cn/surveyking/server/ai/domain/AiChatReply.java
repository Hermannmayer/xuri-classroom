package cn.surveyking.server.ai.domain;

import lombok.Data;









@Data
public class AiChatReply {


	private String reply;


	private String model;

	private Integer promptTokens;

	private Integer completionTokens;

	private Integer totalTokens;


	private Long costMs;





	private String contextLabel;






	private AiChatAction action;

}
