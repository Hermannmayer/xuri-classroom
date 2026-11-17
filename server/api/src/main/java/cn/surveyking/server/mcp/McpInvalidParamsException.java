package cn.surveyking.server.mcp;

/**
 * {@code tools/call} 的参数不合法（缺必填、类型不对、JSON 转 DTO 失败）。
 *
 * <p>映射成 JSON-RPC 的 {@code -32602 Invalid params}：这是协议层的错误，
 * 不是工具执行失败（后者按 MCP 约定返回 {@code isError: true} 的结果，让模型自己改正后重试）。
 */
public class McpInvalidParamsException extends RuntimeException {

	public McpInvalidParamsException(String message) {
		super(message);
	}

}
