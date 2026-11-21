package cn.surveyking.server.service;

import org.springframework.util.StringUtils;







public interface ApiIdempotencyService {


	int MAX_KEY_LENGTH = 128;

	/**
	 * 查第一次的结果。
	 * @param userId 调用者；不同用户用同一个键互不影响
	 * @param key {@link #composeKey} 组合出来的键
	 * @return 命中返回上次结果的 JSON 文本；未命中返回 null
	 */
	String find(String userId, String key);

	/**
	 * 记住第一次的结果。
	 *
	 * <p>并发下唯一键可能已经被另一个线程写进去：这种情况静默忽略，由调用方决定回放谁的
	 * （{@code McpServer} 先查后写，真撞上了说明两路几乎同时到达，回放已存在的那条即可）。
	 */
	void remember(String userId, String key, String resultJson);

	/**
	 * 组合幂等键：{@code 工具名:调用方键}。
	 *
	 * <p>必须带上工具名：客户端如果把同一个键复用到另一个工具上，不区分就会拿到上一个工具的结果
	 * ——这正是幂等键最危险的误用方式。超过列宽时退化成「工具名:h:哈希」，保证稳定且仍在 128 内。
	 */
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
