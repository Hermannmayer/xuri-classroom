package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.ApiTokenRequest;
import cn.surveyking.server.domain.dto.ApiTokenView;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.ApiToken;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.ApiTokenMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.ApiTokenService;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.AbstractWrapper;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.toolkit.LambdaUtils;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.validation.ValidationException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;








class ApiTokenServiceImplTest {

	private final ApiTokenMapper apiTokenMapper = mock(ApiTokenMapper.class);

	private final UserMapper userMapper = mock(UserMapper.class);

	/**
	 * 单测不启动 MyBatis，Lambda 缓存是空的：{@code ApiToken::getTokenHash} 解析不出列名。
	 * 这里手动登记一次表元数据（与 NoticeServiceImplTest 同样的处理）。
	 */
	@BeforeAll
	static void initTableInfo() {
		TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
				ApiToken.class);
		LambdaUtils.installCache(tableInfo);
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("签发：返回明文一次，库里只存 SHA-256")
	void issueReturnsPlainTextButStoresHash() {
		login("u1");
		ApiTokenView view = service().issue(request("Claude Desktop"));

		ArgumentCaptor<ApiToken> captor = ArgumentCaptor.forClass(ApiToken.class);
		verify(apiTokenMapper).insert(captor.capture());
		ApiToken saved = captor.getValue();

		String plain = view.getToken();
		assertNotNull(plain);
		assertTrue(plain.startsWith("sk_"), plain);

		assertEquals(35, plain.length(), plain);
		assertEquals(ApiTokenService.sha256(plain), saved.getTokenHash());
		assertNull(saved.getExpiresAt());
		assertEquals(Boolean.FALSE, saved.getRevoked());
		assertEquals("u1", saved.getUserId());
		assertEquals("Claude Desktop", saved.getName());
	}

	@Test
	@DisplayName("签发：两个令牌不会撞（随机部分不重复）")
	void issueGeneratesDistinctTokens() {
		login("u1");
		String first = service().issue(request("a")).getToken();
		String second = service().issue(request("b")).getToken();
		assertTrue(!first.equals(second), first + " / " + second);
	}

	@Test
	@DisplayName("签发：名称空 / 过期时间在过去 → 400，且不落库")
	void issueValidatesInput() {
		login("u1");
		assertThrows(ValidationException.class, () -> service().issue(request("  ")));

		ApiTokenRequest expired = request("旧令牌");
		expired.setExpiresAt("2020-01-01 00:00:00");
		ValidationException ex = assertThrows(ValidationException.class, () -> service().issue(expired));
		assertTrue(ex.getMessage().contains("晚于"), ex.getMessage());
		verify(apiTokenMapper, never()).insert(any(ApiToken.class));
	}

	@Test
	@DisplayName("签发：过期时间两种格式都认（空格 / ISO）")
	void issueParsesBothDateFormats() {
		login("u1");
		ApiTokenRequest space = request("带空格");
		space.setExpiresAt("2099-12-31 23:59:59");
		ApiTokenRequest iso = request("ISO");
		iso.setExpiresAt("2099-12-31T23:59:59");
		service().issue(space);
		service().issue(iso);
		ArgumentCaptor<ApiToken> captor = ArgumentCaptor.forClass(ApiToken.class);
		verify(apiTokenMapper, times(2)).insert(captor.capture());
		for (ApiToken saved : captor.getAllValues()) {
			assertNotNull(saved.getExpiresAt());
		}
	}

	@Test
	@DisplayName("签发：scopes 去空白去重；空则存 null（= 按用户权限）")
	void issueNormalizesScopes() {
		login("u1");
		ApiTokenRequest request = request("白名单");
		request.setScopes(" sk_project_list , sk_project_get,sk_project_list ");
		service().issue(request);
		ArgumentCaptor<ApiToken> captor = ArgumentCaptor.forClass(ApiToken.class);
		verify(apiTokenMapper).insert(captor.capture());
		assertEquals("sk_project_list,sk_project_get", captor.getValue().getScopes());

		service().issue(request("不限"));
		ArgumentCaptor<ApiToken> second = ArgumentCaptor.forClass(ApiToken.class);
		verify(apiTokenMapper, times(2)).insert(second.capture());
		assertNull(second.getAllValues().get(1).getScopes());
	}

	@Test
	@DisplayName("列表：只给哈希前后的指纹，永不返回明文")
	void listMasksToken() {
		login("u1");
		ApiToken row = row("t1", ApiTokenService.sha256("sk_aaaabbbbccccddddffff000011112222"), false, null);
		when(apiTokenMapper.selectList(any())).thenReturn(List.of(row));
		User user = new User();
		user.setId("u1");
		user.setName("张老师");
		when(userMapper.selectBatchIds(any())).thenReturn(List.of(user));

		List<ApiTokenView> views = service().list();
		assertEquals(1, views.size());
		ApiTokenView view = views.get(0);
		String hash = row.getTokenHash();
		assertEquals(hash.substring(0, 4), view.getTokenPrefix());
		assertEquals(hash.substring(hash.length() - 4), view.getTokenSuffix());
		assertEquals(hash.substring(0, 4) + "****" + hash.substring(hash.length() - 4), view.getMaskedToken());
		assertNull(view.getToken(), "列表里绝不能出现明文");
		assertEquals("张老师", view.getUserName());
		assertEquals(Boolean.FALSE, view.getRevoked());
	}

	@Test
	@DisplayName("校验：用哈希查库，撤销 / 过期都返回 null")
	void authenticateRejectsRevokedAndExpired() {
		login("u1");
		ApiToken alive = row("t1", ApiTokenService.sha256("sk_alive"), false, null);
		when(apiTokenMapper.selectOne(any())).thenReturn(alive);
		assertEquals("t1", service().authenticate("sk_alive").getId());


		ArgumentCaptor<Wrapper> captor = ArgumentCaptor.forClass(Wrapper.class);
		verify(apiTokenMapper).selectOne(captor.capture());
		String sql = captor.getValue().getCustomSqlSegment().toLowerCase(Locale.ROOT);
		assertTrue(sql.contains("token_hash"), sql);
		Map<String, Object> params = ((AbstractWrapper<?, ?, ?>) captor.getValue()).getParamNameValuePairs();
		assertTrue(params.containsValue(ApiTokenService.sha256("sk_alive")), params.toString());

		ApiToken revoked = row("t2", ApiTokenService.sha256("sk_revoked"), true, null);
		when(apiTokenMapper.selectOne(any())).thenReturn(revoked);
		assertNull(service().authenticate("sk_revoked"));

		ApiToken expired = row("t3", ApiTokenService.sha256("sk_expired"), false, new Date(0L));
		when(apiTokenMapper.selectOne(any())).thenReturn(expired);
		assertNull(service().authenticate("sk_expired"));

		when(apiTokenMapper.selectOne(any())).thenReturn(null);
		assertNull(service().authenticate("sk_unknown"));
		assertNull(service().authenticate("  "));
	}

	@Test
	@DisplayName("撤销：置 revoked=true；重复撤销按幂等处理")
	void revokeMarksRevoked() {
		ApiToken row = row("t1", ApiTokenService.sha256("sk_a"), false, null);
		when(apiTokenMapper.selectById("t1")).thenReturn(row);
		service().revoke("t1");

		ArgumentCaptor<ApiToken> captor = ArgumentCaptor.forClass(ApiToken.class);
		verify(apiTokenMapper).updateById(captor.capture());
		assertEquals("t1", captor.getValue().getId());
		assertEquals(Boolean.TRUE, captor.getValue().getRevoked());

		row.setRevoked(Boolean.TRUE);
		service().revoke("t1");
		verify(apiTokenMapper, times(1)).updateById(any(ApiToken.class));
	}

	@Test
	@DisplayName("撤销：令牌不存在 → 400；id 为空 → 400")
	void revokeUnknownToken() {
		when(apiTokenMapper.selectById("nope")).thenReturn(null);
		assertThrows(ValidationException.class, () -> service().revoke("nope"));
		assertThrows(ValidationException.class, () -> service().revoke(""));
	}

	@Test
	@DisplayName("last_used_at：每次调用都刷新")
	void touchLastUsed() {
		service().touchLastUsed("t1");
		ArgumentCaptor<ApiToken> captor = ArgumentCaptor.forClass(ApiToken.class);
		verify(apiTokenMapper).updateById(captor.capture());
		assertNotNull(captor.getValue().getLastUsedAt());
		assertEquals("t1", captor.getValue().getId());
	}

	// ---------- 辅助

	private ApiTokenServiceImpl service() {
		return new ApiTokenServiceImpl(apiTokenMapper, userMapper);
	}

	private ApiTokenRequest request(String name) {
		ApiTokenRequest request = new ApiTokenRequest();
		request.setName(name);
		return request;
	}

	private ApiToken row(String id, String hash, boolean revoked, Date expiresAt) {
		ApiToken row = new ApiToken();
		row.setId(id);
		row.setUserId("u1");
		row.setName("Claude");
		row.setTokenHash(hash);
		row.setRevoked(revoked);
		row.setExpiresAt(expiresAt);
		row.setCreateAt(new Date());
		return row;
	}

	private void login(String userId) {
		UserInfo user = new UserInfo();
		user.setUserId(userId);
		user.setName("张老师");
		user.setUsername("zhang");
		user.setStatus(1);
		Set<GrantedAuthority> authorities = new HashSet<>();
		authorities.add(new SimpleGrantedAuthority("system:setting:update"));
		user.setAuthorities(authorities);
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken(user, null, authorities));
	}

}