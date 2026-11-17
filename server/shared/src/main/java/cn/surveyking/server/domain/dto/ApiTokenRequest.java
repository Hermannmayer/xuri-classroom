package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 签发 / 撤销 API Token 的请求体。
 *
 * <p>签发只用 {@link #name}、{@link #scopes}、{@link #expiresAt}；撤销只用 {@link #id}。
 * 合在一个 DTO 里是因为三个字段都很短，不值得为撤销再开一个类。
 */
@Data
public class ApiTokenRequest {

	/** 撤销时必填 */
	private String id;

	/** 签发时必填：给用户辨认用（如 Claude Desktop / 我的脚本），最长 100 字 */
	private String name;

	/**
	 * 逗号分隔的工具白名单，例如 {@code sk_project_list,sk_project_get}。
	 *
	 * <p>留空 = 按签发用户的权限放行全部工具；填了就只允许这些工具，白名单外的直接拒绝。
	 * 不校验工具名是否存在（工具清单在 api 模块，rdbms 不该反向依赖它），
	 * 写错的工具名只会「永远匹配不上」，{@code sk_capabilities} 里能看到实际生效的工具。
	 */
	private String scopes;

	/**
	 * 过期时间，本地时间（GMT+8）。
	 *
	 * <p>用字符串而不是 Date：前端可能发 {@code yyyy-MM-dd HH:mm:ss}，也可能发 ISO 的
	 * {@code yyyy-MM-ddTHH:mm:ss}，这里两种都认（见 {@code ApiTokenServiceImpl#parseExpiresAt}）。
	 * 留空 = 永不过期。
	 */
	private String expiresAt;

}
