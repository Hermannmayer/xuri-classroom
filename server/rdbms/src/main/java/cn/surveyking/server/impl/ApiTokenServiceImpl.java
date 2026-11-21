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













@Slf4j
@Service
@RequiredArgsConstructor
public class ApiTokenServiceImpl implements ApiTokenService {


	static final String PLAIN_PREFIX = "sk_";


	static final int SECRET_BYTES = 16;


	static final int NAME_MAX_LENGTH = 100;


	static final int MASK_KEEP = 4;

	private static final String MASK = "****";

	private static final SecureRandom RANDOM = new SecureRandom();


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

	/** 过期时间解析：yyyy-MM-dd HH:mm:ss 与 ISO 的 yyyy-MM-ddTHH:mm:ss 都认 */
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


	private String normalizeScopes(String scopes) {
		List<String> list = ApiTokenService.parseScopes(scopes);
		return list.isEmpty() ? null : String.join(",", list);
	}

	private static String randomSecret() {
		byte[] bytes = new byte[SECRET_BYTES];
		RANDOM.nextBytes(bytes);
		return HexFormat.of().formatHex(bytes);
	}

	/** 批量补签发用户显示名 */
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

	/** 实体 → 视图 */
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
