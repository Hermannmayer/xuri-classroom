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












public interface ApiTokenService {

	/** 签发一个令牌（绑定当前登录用户）；返回 视图 + {@code token} 明文（只此一次）。 */
	ApiTokenView issue(ApiTokenRequest request);

	/** 全部令牌（含已撤销的，按签发时间倒序）；不返回明文 */
	List<ApiTokenView> list();

	/** 撤销：revoked=true，记录保留 */
	void revoke(String id);

	/** 用明文换令牌行：哈希比对 + 未撤销 + 未过期；返回 命中返回实体；无效 / 已撤销 / 已过期返回 null。 */
	ApiToken authenticate(String rawToken);

	/** 更新 last_used_at；失败只打日志，不影响调用本身 */
	void touchLastUsed(String id);

	/** 令牌哈希：SHA-256 十六进制小写 */
	static String sha256(String raw) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException e) {

			throw new IllegalStateException("JVM 不支持 SHA-256", e);
		}
	}

	/** scopes 解析：逗号分隔，去空白、去重、保序；返回 空列表表示「没配白名单」= 按用户权限放行全部工具 */
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
