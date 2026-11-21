package cn.surveyking.server.ai.domain;

import lombok.Data;

import java.util.List;
















@Data
public class AiChatRequest {





	private List<Message> messages;


	private Context context;


	private String model;

	@Data
	public static class Message {


		private String role;

		private String content;

	}





	@Data
	public static class Context {


		private String route;


		private String page;


		private String projectId;


		private String questionId;


		private String answerId;







		private String classId;


		private String repoId;

	}

}
