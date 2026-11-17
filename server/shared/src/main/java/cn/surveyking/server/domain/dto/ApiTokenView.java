package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/**
 * 一行 API Token（列表）与签发结果（多一个明文 {@link #token}）。
 *
 * <p>明文只在签发响应里出现一次：库里存的是 SHA-256（见 db/migration/V2.2.5__api_token.sql），
 * 服务端拿到哈希也还原不出原文，所以列表接口永远不返回 {@link #token}。
 *
 * <p>{@link #tokenPrefix} / {@link #tokenSuffix} / {@link #maskedToken} 是**哈希指纹**，不是明文片段：
 * 既然只有哈希，能给用户辨认的就只有它。不要把它们当成「令牌开头 4 位」拿去和用户手里的明文比对，
 * 列表里的主标识是 {@link #name}。
 */
@Data
public class ApiTokenView {

	private String id;

	/** 给用户辨认用的名字，如「Claude Desktop」「我的脚本」 */
	private String name;

	/** 签发给了哪个用户；MCP 调用时的权限就是这个人的权限 */
	private String userId;

	/** 签发用户的显示名（列表里补的，解析不到为空） */
	private String userName;

	/** 哈希前 4 位 */
	private String tokenPrefix;

	/** 哈希后 4 位 */
	private String tokenSuffix;

	/** {@code 前4位****后4位}，前端直接展示这个 */
	private String maskedToken;

	/** 逗号分隔的工具白名单；空 = 按用户权限放行全部工具 */
	private String scopes;

	private Date expiresAt;

	private Date lastUsedAt;

	/** 是否已撤销；撤销后立刻调不动 /mcp */
	private Boolean revoked;

	private Date createAt;

	/**
	 * 令牌明文，**只有签发（POST /api/system/api-token）那一次**返回。
	 *
	 * <p>全局 Jackson 配置是 {@code default-property-inclusion: non_null}，列表里这个字段整个不出现。
	 */
	private String token;

}
