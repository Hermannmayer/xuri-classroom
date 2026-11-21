package cn.surveyking.server.mcp;

import java.util.List;










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
