package cn.surveyking.server.ai.core;

import org.springframework.util.StringUtils;

/**
 * 对话里的一条消息（{@link AiGateway#completeConversation} 的输入）。
 *
 * <p>为什么要有这个类型，而不是直接拼两段字符串：多轮对话必须保留「谁说的」这个角色，
 * 把历史压成一段文本会让模型分不清哪句是用户问的、哪句是它自己答的，追问时会答串。
 *
 * <p>角色只允许三种（与 OpenAI 兼容接口一致）：{@code system} / {@code user} / {@code assistant}。
 * 前端传来的历史里即使混进 {@code system}，也会在上层被丢掉——系统提示只能由后端生成。
 *
 * @author ai-sidebar
 */
public record AiChatTurn(String role, String content) {

	/** 系统提示（只由后端生成） */
	public static final String ROLE_SYSTEM = "system";

	/** 用户提问 */
	public static final String ROLE_USER = "user";

	/** 模型回答 */
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
