package cn.surveyking.server.mcp;

import java.util.List;










public record McpCaller(String tokenId, String tokenName, String userId, String userName, List<String> scopes) {

	/** 这个令牌能不能用某个工具 */
	public boolean allowsTool(String toolName) {
		return scopes == null || scopes.isEmpty() || scopes.contains(toolName);
	}

}
