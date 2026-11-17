package cn.surveyking.server.mcp;

/**
 * 一个 MCP 工具的静态定义（协议层用）。
 *
 * @param name 工具名，{@code sk_} 前缀
 * @param title 中文名，给 {@code sk_capabilities} 与日志用
 * @param description 给模型看的一句话说明：写清「做什么、要什么权限、有没有副作用」
 * @param permission 需要的权限码；null 表示不需要额外权限（{@code sk_capabilities}）
 * @param write 是否写操作：写操作必须带 {@code idempotencyKey}，且会先查幂等表
 * @param inputSchema JSON Schema 字符串（不做 schema 库依赖，直接给协议原文）
 */
public record McpToolDefinition(String name, String title, String description, String permission, boolean write,
		String inputSchema) {

}
