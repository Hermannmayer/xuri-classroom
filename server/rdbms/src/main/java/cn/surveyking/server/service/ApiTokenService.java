package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.ApiTokenRequest;
import cn.surveyking.server.domain.dto.ApiTokenView;
import cn.surveyking.server.domain.model.ApiToken;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * MCP / API 访问令牌（计划 §7.3）。
 *
 * <p>边界：
 * <ul>
 * <li>签发只返回一次明文，库里只有 SHA-256；列表永远拿不到明文；</li>
 * <li>令牌不是「另一套权限」：它绑定一个用户，MCP 调用时把该用户塞进 SecurityContext，
 * 权限判定仍然走现有 {@code @PreAuthorize}；{@code scopes} 只是在权限之上再收一层工具白名单；</li>
 * <li>撤销立刻生效：{@link #authenticate} 每次都读库（不缓存），撤销后下一次调用就是 401。</li>
 * </ul>
 */
public interface ApiTokenService {

	/**
	 * 签发一个令牌（绑定当前登录用户）。
	 * @param request name 必填；scopes / expiresAt 可空
	 * @return 视图 + {@code token} 明文（只此一次）
	 * @throws jakarta.validation.ValidationException 名称空 / 超长 / 过期时间格式错或在过去
	 */
	ApiTokenView issue(ApiTokenRequest request);

	/** 全部令牌（含已撤销的，按签发时间倒序）；不返回明文 */
	List<ApiTokenView> list();

	/**
	 * 撤销：revoked=true，记录保留。重复撤销按幂等处理。
	 * @throws jakarta.validation.ValidationException 令牌不存在
	 */
	void revoke(String id);

	/**
	 * 用明文换令牌行：哈希比对 + 未撤销 + 未过期。
	 * @param rawToken 请求头里的明文
	 * @return 命中返回实体；无效 / 已撤销 / 已过期返回 null
	 */
	ApiToken authenticate(String rawToken);

	/** 更新 last_used_at；失败只打日志，不影响调用本身 */
	void touchLastUsed(String id);

	/**
	 * 令牌哈希：SHA-256 十六进制小写。
	 *
	 * <p>做成接口上的静态方法而不是各实现自己算：签发与校验必须用同一套哈希，
	 * 一旦有人换了算法（比如加盐），旧令牌会全部失效且很难排查。
	 */
	static String sha256(String raw) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException e) {
			// 每个 JVM 都必须带 SHA-256，缺了说明运行环境损坏，直接失败比静默降级安全
			throw new IllegalStateException("JVM 不支持 SHA-256", e);
		}
	}

	/**
	 * scopes 解析：逗号分隔，去空白、去重、保序。
	 * @return 空列表表示「没配白名单」= 按用户权限放行全部工具
	 */
	static List<String> parseScopes(String scopes) {
		if (!StringUtils.hasText(scopes)) {
			return new ArrayList<>();
		}
		LinkedHashSet<String> set = new LinkedHashSet<>();
		for (String part : scopes.split(",")) {
			if (StringUtils.hasText(part)) {
				set.add(part.trim());
			}
		}
		return new ArrayList<>(set);
	}

}
