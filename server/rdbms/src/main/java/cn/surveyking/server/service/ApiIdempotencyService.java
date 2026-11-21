package cn.surveyking.server.service;

import org.springframework.util.StringUtils;







public interface ApiIdempotencyService {


	int MAX_KEY_LENGTH = 128;

	/** 查第一次的结果；返回 命中返回上次结果的 JSON 文本；未命中返回 null。 */
	String find(String userId, String key);

	/** 记住第一次的结果 */
	void remember(String userId, String key, String resultJson);

	/** 组合幂等键：工具名:调用方键 */
	static String composeKey(String toolName, String userKey) {
		String tool = StringUtils.hasText(toolName) ? toolName.trim() : "tool";
		String key = userKey == null ? "" : userKey.trim();
		String composed = tool + ":" + key;
		if (composed.length() <= MAX_KEY_LENGTH) {
			return composed;
		}
		return tool + ":h:" + ApiTokenService.sha256(composed);
	}

}
