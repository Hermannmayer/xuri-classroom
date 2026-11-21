package cn.surveyking.server.ai.core;

import org.springframework.util.StringUtils;












public record AiChatTurn(String role, String content) {


	public static final String ROLE_SYSTEM = "system";


	public static final String ROLE_USER = "user";


	public static final String ROLE_ASSISTANT = "assistant";

	public AiChatTurn {
		role = StringUtils.hasText(role) ? role.trim().toLowerCase() : ROLE_USER;
		content = content == null ? "" : content;
	}

	public static AiChatTurn system(String content) {
		return new AiChatTurn(ROLE_SYSTEM, content);
	}

	public static AiChatTurn user(String content) {
		return new AiChatTurn(ROLE_USER, content);
	}

	public static AiChatTurn assistant(String content) {
		return new AiChatTurn(ROLE_ASSISTANT, content);
	}

	/** 是否是本轮真正要回答的问题（最后一条 user 消息） */
	public boolean isUser() {
		return ROLE_USER.equals(role);
	}

}
