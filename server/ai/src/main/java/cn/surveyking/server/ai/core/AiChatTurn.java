package cn.surveyking.server.ai.core;

import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public record AiChatTurn(String role, String content, List<String> imageDataUrls) {

	public static final String ROLE_SYSTEM = "system";

	public static final String ROLE_USER = "user";

	public static final String ROLE_ASSISTANT = "assistant";

	public static final int MAX_IMAGES = 10;

	/**
	 * 归一化消息：角色缺省为 user，正文缺省为空串，图片列表去掉 null / 空元素并最多保留 10 张。
	 */
	public AiChatTurn {
		role = StringUtils.hasText(role) ? role.trim().toLowerCase() : ROLE_USER;
		content = content == null ? "" : content;
		imageDataUrls = sanitizeImages(imageDataUrls);
	}

	/** 纯文本消息（不带图片）。 */
	public AiChatTurn(String role, String content) {
		this(role, content, List.of());
	}

	public static AiChatTurn system(String content) {
		return new AiChatTurn(ROLE_SYSTEM, content);
	}

	public static AiChatTurn user(String content) {
		return new AiChatTurn(ROLE_USER, content);
	}

	/** 用户消息，可带 0~10 张图片 data URL。 */
	public static AiChatTurn user(String content, List<String> imageDataUrls) {
		return new AiChatTurn(ROLE_USER, content, imageDataUrls);
	}

	public static AiChatTurn assistant(String content) {
		return new AiChatTurn(ROLE_ASSISTANT, content);
	}

	/** 是否是本轮真正要回答的问题（最后一条 user 消息） */
	public boolean isUser() {
		return ROLE_USER.equals(role);
	}

	/** 这条消息是否附了图片。 */
	public boolean hasImages() {
		return !imageDataUrls.isEmpty();
	}

	private static List<String> sanitizeImages(List<String> imageDataUrls) {
		if (imageDataUrls == null || imageDataUrls.isEmpty()) {
			return List.of();
		}
		List<String> kept = new ArrayList<>(Math.min(imageDataUrls.size(), MAX_IMAGES));
		for (String dataUrl : imageDataUrls) {
			if (!StringUtils.hasText(dataUrl)) {
				continue;
			}
			kept.add(dataUrl.trim());
			if (kept.size() >= MAX_IMAGES) {
				break;
			}
		}
		return kept.isEmpty() ? List.of() : List.copyOf(kept);
	}

}
