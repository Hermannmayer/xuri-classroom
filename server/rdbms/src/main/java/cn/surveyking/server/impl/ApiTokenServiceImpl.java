package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ApiTokenRequest;
import cn.surveyking.server.domain.dto.ApiTokenView;
import cn.surveyking.server.domain.model.ApiToken;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.ApiTokenMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.ApiTokenService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.validation.ValidationException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * API Token 实现。
 *
 * <p>几个刻意的选择：
 * <ul>
 * <li>明文格式 {@code sk_ + 32 位十六进制}：前缀让人一眼看出是本站令牌，随机部分 128 bit 熵，
 * 不会被「猜」出来；</li>
 * <li>签发时不再二次加密：SHA-256 已经足够（令牌本身就是 128 bit 随机串，不存在字典攻击面）；</li>
 * <li>{@link #authenticate} 不缓存：撤销要「立刻 401」，缓存一秒钟都是漏洞；单条主键查询的代价可以忽略；</li>
 * <li>{@link #touchLastUsed} 失败只打日志：它只是排障信息，不该让 MCP 调用失败。</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiTokenServiceImpl implements ApiTokenService {

	/** 明文前缀 */
	static final String PLAIN_PREFIX = "sk_";

	/** 随机部分字节数：16 字节 = 128 bit → 32 位十六进制 */
	static final int SECRET_BYTES = 16;

	/** 名称长度上限（与 t_api_token.name 的 varchar(100) 对齐） */
	static final int NAME_MAX_LENGTH = 100;

	/** 指纹保留位数（前/后各 4 位） */
	static final int MASK_KEEP = 4;

	private static final String MASK = "****";

	private static final SecureRandom RANDOM = new SecureRandom();

	/** 库里全是本地时间（dataSource 的 serverTimezone 也是 GMT+8），这里按同一时区解释入参 */
	private static final ZoneId ZONE = ZoneId.of("GMT+8");

	private final ApiTokenMapper apiTokenMapper;

	private final UserMapper userMapper;

	@Override
	public ApiTokenView issue(ApiTokenRequest request) {
		String name = request == null || request.getName() == null ? null : request.getName().trim();
		if (!StringUtils.hasText(name)) {
			throw new ValidationException("令牌名称不能为空");
		}
		if (name.length() > NAME_MAX_LENGTH) {
			throw new ValidationException("令牌名称最长 " + NAME_MAX_LENGTH + " 个字符");
		}
		String userId = SecurityContextUtils.getUserId();
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			throw new ValidationException("签发令牌需要先登录");
		}
		Date expiresAt = parseExpiresAt(request.getExpiresAt());
		String scopes = normalizeScopes(request.getScopes());
		String plain = PLAIN_PREFIX + randomSecret();

		ApiToken entity = new ApiToken();
		entity.setUserId(userId);
		entity.setName(name);
		entity.setTokenHash(ApiTokenService.sha256(plain));
		entity.setScopes(scopes);
		entity.setExpiresAt(expiresAt);
		entity.setRevoked(Boolean.FALSE);
		apiTokenMapper.insert(entity);

		ApiTokenView view = toView(entity, null);
		// 明文只在这里出现一次：实体里的 tokenHash 再也还原不出它
		view.setToken(plain);
		return view;
	}

	@Override
	public List<ApiTokenView> list() {
		List<ApiToken> rows = apiTokenMapper.selectList(Wrappers.<ApiToken>lambdaQuery()
				.orderByDesc(ApiToken::getCreateAt).orderByDesc(ApiToken::getId));
		if (rows.isEmpty()) {
			return new ArrayList<>();
		}
		Map<String, String> names = userNamesOf(rows);
		List<ApiTokenView> views = new ArrayList<>(rows.size());
		for (ApiToken row : rows) {
			views.add(toView(row, names.get(row.getUserId())));
		}
		return views;
	}

	@Override
	public void revoke(String id) {
		if (!StringUtils.hasText(id)) {
			throw new ValidationException("请指定要撤销的令牌");
		}
		ApiToken token = apiTokenMapper.selectById(id);
		if (token == null) {
			throw new ValidationException("令牌不存在");
		}
		if (Boolean.TRUE.equals(token.getRevoked())) {
			// 重复撤销按幂等处理：前端连点两次不该报错
			return;
		}
		ApiToken patch = new ApiToken();
		patch.setId(id);
		patch.setRevoked(Boolean.TRUE);
		apiTokenMapper.updateById(patch);
	}

	@Override
	public ApiToken authenticate(String rawToken) {
		if (!StringUtils.hasText(rawToken)) {
			return null;
		}
		String hash = ApiTokenService.sha256(rawToken.trim());
		ApiToken token = apiTokenMapper.selectOne(
				Wrappers.<ApiToken>lambdaQuery().eq(ApiToken::getTokenHash, hash).last("LIMIT 1"));
		if (token == null) {
			return null;
		}
		if (Boolean.TRUE.equals(token.getRevoked())) {
			return null;
		}
		if (token.getExpiresAt() != null && token.getExpiresAt().before(new Date())) {
			return null;
		}
		return token;
	}

	@Override
	public void touchLastUsed(String id) {
		if (!StringUtils.hasText(id)) {
			return;
		}
		try {
			ApiToken patch = new ApiToken();
			patch.setId(id);
			patch.setLastUsedAt(new Date());
			apiTokenMapper.updateById(patch);
		}
		catch (Exception e) {
			log.warn("更新令牌最近使用时间失败 id={}", id, e);
		}
	}

	/**
	 * 过期时间解析：{@code yyyy-MM-dd HH:mm:ss} 与 ISO 的 {@code yyyy-MM-ddTHH:mm:ss} 都认。
	 *
	 * <p>为什么要宽容：前端可能按 Jackson 全局格式发，也可能按 ISO 发；为一个可选字段让用户
	 * 反复猜格式不值得。空格统一换成 T 之后交给 {@link DateTimeFormatter#ISO_LOCAL_DATE_TIME}。
	 */
	private Date parseExpiresAt(String raw) {
		if (!StringUtils.hasText(raw)) {
			return null;
		}
		String text = raw.trim().replace(' ', 'T');
		LocalDateTime time;
		try {
			time = LocalDateTime.parse(text, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
		}
		catch (DateTimeParseException e) {
			throw new ValidationException("过期时间格式不正确，应为 yyyy-MM-dd HH:mm:ss");
		}
		Date date = Date.from(time.atZone(ZONE).toInstant());
		if (!date.after(new Date())) {
			throw new ValidationException("过期时间必须晚于当前时间");
		}
		return date;
	}

	/** 白名单规范化：空 → null（库里用 null 表示「按用户权限」），否则去重后用逗号拼回去 */
	private String normalizeScopes(String scopes) {
		List<String> list = ApiTokenService.parseScopes(scopes);
		return list.isEmpty() ? null : String.join(",", list);
	}

	private static String randomSecret() {
		byte[] bytes = new byte[SECRET_BYTES];
		RANDOM.nextBytes(bytes);
		return HexFormat.of().formatHex(bytes);
	}

	/**
	 * 批量补签发用户显示名。
	 *
	 * <p>不逐行 {@code selectById}：令牌列表通常几十条，逐个查库是 N+1。
	 */
	private Map<String, String> userNamesOf(List<ApiToken> rows) {
		Set<String> ids = rows.stream().map(ApiToken::getUserId).filter(StringUtils::hasText)
				.collect(Collectors.toCollection(LinkedHashSet::new));
		if (ids.isEmpty()) {
			return new HashMap<>();
		}
		List<User> users = userMapper.selectBatchIds(ids);
		Map<String, String> names = new HashMap<>();
		if (users == null) {
			return names;
		}
		for (User user : users) {
			if (user != null && StringUtils.hasText(user.getId())) {
				names.put(user.getId(), user.getName());
			}
		}
		return names;
	}

	/**
	 * 实体 → 视图。
	 *
	 * <p>指纹取的是**哈希**的首尾 4 位：表里只存 SHA-256（V2.2.5 已落地，不允许加列），
	 * 明文片段根本拿不到。列表里的主标识是 name，指纹只用来「同一批令牌里区分谁是谁」。
	 */
	private ApiTokenView toView(ApiToken row, String userName) {
		ApiTokenView view = new ApiTokenView();
		view.setId(row.getId());
		view.setName(row.getName());
		view.setUserId(row.getUserId());
		view.setUserName(userName);
		view.setScopes(row.getScopes());
		view.setExpiresAt(row.getExpiresAt());
		view.setLastUsedAt(row.getLastUsedAt());
		view.setRevoked(Boolean.TRUE.equals(row.getRevoked()));
		view.setCreateAt(row.getCreateAt());
		String hash = row.getTokenHash() == null ? "" : row.getTokenHash();
		String prefix = hash.length() > MASK_KEEP ? hash.substring(0, MASK_KEEP) : hash;
		String suffix = hash.length() > MASK_KEEP ? hash.substring(hash.length() - MASK_KEEP) : hash;
		view.setTokenPrefix(prefix);
		view.setTokenSuffix(suffix);
		view.setMaskedToken(prefix + MASK + suffix);
		return view;
	}

}
