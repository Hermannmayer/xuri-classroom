package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiUsageView;
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.AiUsage;
import cn.surveyking.server.mapper.AiUsageMapper;
import cn.surveyking.server.service.SystemService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * AI 用量记账与限额（{@code AiUsageServiceImpl}）的规则回归。
 *
 * <p>三件事必须钉住：
 * <ol>
 * <li><b>超限不调模型</b>：限额判断要在调用之前拦住，所以断言「抛异常」还不够，
 * 还要断言另一层额度根本没去查（单用户超限时不该再查全站）；</li>
 * <li><b>默认值只在缺省时生效</b>：库里的 0 表示「不限」，不能被默认值顶掉，
 * 否则管理员想放开额度怎么都放开不了；</li>
 * <li><b>记账失败不能带崩业务</b>：insert 抛异常时调用方不该看到异常。</li>
 * </ol>
 *
 * <p>纯 Mockito，不起 Spring、不连库。
 *
 * @author p4-backend
 */
class AiUsageServiceImplTest {

	private final AiUsageMapper aiUsageMapper = mock(AiUsageMapper.class);

	private final SystemService systemService = mock(SystemService.class);

	private final AiUsageServiceImpl service = new AiUsageServiceImpl(aiUsageMapper, systemService);

	@BeforeEach
	void setUp() {
		when(systemService.getSystemAiSetting()).thenReturn(setting(Integer.valueOf(200_000), Integer.valueOf(2_000_000)));
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("单人额度用完：直接拒绝，不再去查全站额度")
	void blocksWhenUserQuotaExhausted() {
		when(aiUsageMapper.sumTokensByUser(eq("teacher-1"), any(Date.class))).thenReturn(200_000L);
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service.assertQuota("teacher-1"));
		assertTrue(ex.getMessage().contains("单人上限"), ex.getMessage());
		assertTrue(ex.getMessage().contains("200000"), ex.getMessage());
		assertEquals(ErrorCode.ValidationError, ex.getErrorCode());
		verify(aiUsageMapper, never()).sumTokensSince(any(Date.class));
	}

	@Test
	@DisplayName("全站额度用完：单人没超也拒绝")
	void blocksWhenSiteQuotaExhausted() {
		when(aiUsageMapper.sumTokensByUser(eq("teacher-1"), any(Date.class))).thenReturn(10L);
		when(aiUsageMapper.sumTokensSince(any(Date.class))).thenReturn(2_000_000L);
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service.assertQuota("teacher-1"));
		assertTrue(ex.getMessage().contains("全站"), ex.getMessage());
	}

	@Test
	@DisplayName("没超限：放行（两层额度都查一次）")
	void allowsWhenUnderQuota() {
		when(aiUsageMapper.sumTokensByUser(eq("teacher-1"), any(Date.class))).thenReturn(1_000L);
		when(aiUsageMapper.sumTokensSince(any(Date.class))).thenReturn(2_000L);
		service.assertQuota("teacher-1");
		verify(aiUsageMapper).sumTokensByUser(eq("teacher-1"), any(Date.class));
		verify(aiUsageMapper).sumTokensSince(any(Date.class));
	}

	@Test
	@DisplayName("系统设置里没填限额：按默认值（单人 20 万）判")
	void fallsBackToDefaultLimits() {
		when(systemService.getSystemAiSetting()).thenReturn(new SystemInfo.AiSetting());
		when(aiUsageMapper.sumTokensByUser(eq("teacher-1"), any(Date.class))).thenReturn(200_000L);
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service.assertQuota("teacher-1"));
		assertTrue(ex.getMessage().contains("200000"), ex.getMessage());
	}

	@Test
	@DisplayName("限额配成 0：表示不限，不拦（自建模型的学校要能放开）")
	void zeroLimitsMeanUnlimited() {
		when(systemService.getSystemAiSetting()).thenReturn(setting(Integer.valueOf(0), Integer.valueOf(0)));
		when(aiUsageMapper.sumTokensByUser(anyString(), any(Date.class))).thenReturn(10_000_000L);
		when(aiUsageMapper.sumTokensSince(any(Date.class))).thenReturn(10_000_000L);
		service.assertQuota("teacher-1");
	}

	@Test
	@DisplayName("记账：total = 输入 + 输出，状态与失败原因原样落库")
	void recordsUsageWithTotalTokens() {
		service.record("teacher-1", "paper_generate", "gpt-4o-mini", 1200, 800, 4321L, AiUsage.STATUS_OK, null);
		ArgumentCaptor<AiUsage> captor = ArgumentCaptor.forClass(AiUsage.class);
		verify(aiUsageMapper).insert(captor.capture());
		AiUsage saved = captor.getValue();
		assertEquals("teacher-1", saved.getUserId());
		assertEquals("paper_generate", saved.getScene());
		assertEquals("gpt-4o-mini", saved.getModel());
		assertEquals(Integer.valueOf(1200), saved.getPromptTokens());
		assertEquals(Integer.valueOf(800), saved.getCompletionTokens());
		assertEquals(Integer.valueOf(2000), saved.getTotalTokens());
		assertEquals(Long.valueOf(4321L), saved.getCostMs());
		assertEquals(AiUsage.STATUS_OK, saved.getStatus());
		assertNotNull(saved.getCreateAt());
	}

	@Test
	@DisplayName("记账：失败原因超过 500 字先截断（列宽 500，别让记账把业务带崩）")
	void truncatesLongError() {
		service.record("teacher-1", "grade_suggest", null, 0, 0, 10L, AiUsage.STATUS_ERROR, "x".repeat(800));
		ArgumentCaptor<AiUsage> captor = ArgumentCaptor.forClass(AiUsage.class);
		verify(aiUsageMapper).insert(captor.capture());
		assertEquals(500, captor.getValue().getError().length());
	}

	@Test
	@DisplayName("记账失败不能带崩业务：insert 抛异常时调用方无感")
	void swallowsInsertFailure() {
		when(aiUsageMapper.insert(any(AiUsage.class))).thenThrow(new RuntimeException("db down"));
		service.record("teacher-1", "report_summary", null, 10, 20, 30L, AiUsage.STATUS_OK, null);
	}

	@Test
	@DisplayName("当日用量：带出两层额度与按场景汇总")
	void todayReturnsLimitsAndSceneSummary() {
		login("teacher-1");
		when(aiUsageMapper.sumTokensByUser(eq("teacher-1"), any(Date.class))).thenReturn(1_500L);
		when(aiUsageMapper.sumTokensSince(any(Date.class))).thenReturn(9_000L);
		Map<String, Object> row = new LinkedHashMap<>();
		row.put("scene", "paper_generate");
		row.put("calls", Long.valueOf(2L));
		row.put("tokens", Long.valueOf(1_500L));
		when(aiUsageMapper.summaryBySceneForUser(eq("teacher-1"), any(Date.class))).thenReturn(List.of(row));

		AiUsageView view = service.today();
		assertEquals(Long.valueOf(1_500L), view.getUserTokens());
		assertEquals(Integer.valueOf(200_000), view.getUserLimit());
		assertEquals(Long.valueOf(9_000L), view.getDailyTokens());
		assertEquals(Integer.valueOf(2_000_000), view.getDailyLimit());
		assertEquals(1, view.getScenes().size());
		assertEquals("paper_generate", view.getScenes().get(0).getScene());
		assertEquals(Long.valueOf(2L), view.getScenes().get(0).getCalls());
		assertEquals(Long.valueOf(1_500L), view.getScenes().get(0).getTokens());
	}

	/* ====== helpers ====== */

	private static SystemInfo.AiSetting setting(Integer perUser, Integer daily) {
		SystemInfo.AiSetting setting = new SystemInfo.AiSetting();
		setting.setPerUserDailyLimit(perUser);
		setting.setDailyTokenLimit(daily);
		setting.setEnabled(Boolean.TRUE);
		return setting;
	}

	private void login(String userId) {
		UserInfo info = new UserInfo();
		info.setUserId(userId);
		Set<GrantedAuthority> granted = Set.of(new SimpleGrantedAuthority("ai:use"));
		info.setAuthorities(granted);
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken(info, null, granted));
		assertEquals(userId, SecurityContextUtils.getUserId());
	}

}
