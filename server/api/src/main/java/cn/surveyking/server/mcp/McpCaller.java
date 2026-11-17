package cn.surveyking.server.mcp;

import java.util.List;

/**
 * 一次 MCP 调用的身份：由请求头 {@code Authorization: Bearer <token>} 解析出来。
 *
 * @param tokenId 令牌行 id（记审计用）
 * @param tokenName 令牌名（用户起的名字，审计里比 id 好认）
 * @param userId 令牌绑定用户；权限判定用的就是他的权限
 * @param userName 用户显示名
 * @param scopes 工具白名单；空列表 = 不限制（按用户权限）
 */
public record McpCaller(String tokenId, String tokenName, String userId, String userName, List<String> scopes) {

	/**
	 * 这个令牌能不能用某个工具。
	 *
	 * <p>只判白名单，不判权限：权限由工具方法上的 {@code @PreAuthorize} 判定，
	 * 两条规则故意分开——白名单是「这个令牌允许用哪些工具」，权限是「这个人能不能做这件事」。
	 */
	public boolean allowsTool(String toolName) {
		return scopes == null || scopes.isEmpty() || scopes.contains(toolName);
	}

}
