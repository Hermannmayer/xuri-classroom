package cn.surveyking.server.ai.domain;

import lombok.Data;
import java.util.List;






@Data
public class ChatRequest {




	private String conversationId;




	private String model;




	private List<EnterMessage> additionalMessages;




	private String systemPrompt;




	private String locale;

	@Data
	public static class EnterMessage {




		private String role;




		private String content;

	}

}
