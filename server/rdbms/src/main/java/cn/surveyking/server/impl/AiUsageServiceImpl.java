package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiUsageView;
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.domain.model.AiUsage;
import cn.surveyking.server.mapper.AiUsageMapper;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.SystemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * AI 用量记账与限额实现。
 *
 * <p>「当日」的口径是<b>本地时区的自然日零点</b>（{@link LocalDate#now()}），不是「最近 24 小时」：
 * 老师理解的「每天额度」是自然日，跨零点重置才符合直觉。
 *
 * <p>超限时抛 {@code ErrorCodeException(ValidationError)}（HTTP 400），消息里带具体数字，例如
 * 「今日 AI 用量已达单人上限（已用 200000 / 上限 200000 tokens）」，老师能自己判断是「等明天」还是「找管理员」。
 *
 * @author p4-backend
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiUsageServiceImpl implements AiUsageService {

	/** 失败原因列最长 500（与 V2.2.4 的列宽一致），超了先截断，别让记账把业务带崩 */
	private static final int MAX_ERROR_LENGTH = 500;

	private final AiUsageMapper aiUsageMapper;

	private final SystemService systemService;

	@Override
	public void assertQuota(String userId) {
		SystemInfo.AiSetting setting = systemService.getSystemAiSetting();
		int perUserLimit = limit(setting == null ? null : setting.getPerUserDailyLimit(), DEFAULT_PER_USER_TOKEN_LIMIT);
		int dailyLimit = limit(setting == null ? null : setting.getDailyTokenLimit(), DEFAULT_DAILY_TOKEN_LIMIT);
		Date from = startOfToday();
		if (perUserLimit > 0 && StringUtils.hasText(userId)) {
			long used = aiUsageMapper.sumTokensByUser(userId, from);
			if (used >= perUserLimit) {
				throw new ErrorCodeException(ErrorCode.ValidationError, "今日 AI 用量已达单人上限（已用 " + used + " / 上限 "
						+ perUserLimit + " tokens），请明天再试，或让管理员在系统设置里调高限额");
			}
		}
		if (dailyLimit > 0) {
			long used = aiUsageMapper.sumTokensSince(from);
			if (used >= dailyLimit) {
				throw new ErrorCodeException(ErrorCode.ValidationError, "今日全站 AI 用量已达上限（已用 " + used + " / 上限 "
						+ dailyLimit + " tokens），请明天再试，或让管理员在系统设置里调高限额");
			}
		}
	}

	@Override
	public void record(String userId, String scene, String model, int promptTokens, int completionTokens, long costMs,
			String status, String error) {
		try {
			int prompt = Math.max(0, promptTokens);
			int completion = Math.max(0, completionTokens);
			AiUsage usage = new AiUsage();
			usage.setUserId(StringUtils.hasText(userId) ? userId : "-");
			usage.setScene(StringUtils.hasText(scene) ? scene : "-");
			usage.setModel(model);
			usage.setPromptTokens(Integer.valueOf(prompt));
			usage.setCompletionTokens(Integer.valueOf(completion));
			usage.setTotalTokens(Integer.valueOf(prompt + completion));
			usage.setCostMs(Long.valueOf(Math.max(0L, costMs)));
			usage.setStatus(StringUtils.hasText(status) ? status : AiUsage.STATUS_OK);
			usage.setError(truncate(error));
			usage.setCreateAt(new Date());
			aiUsageMapper.insert(usage);
			log.info("AI 用量: user={}, scene={}, model={}, tokens={}+{}={}, costMs={}, status={}", usage.getUserId(),
					usage.getScene(), model, prompt, completion, prompt + completion, costMs, usage.getStatus());
		}
		catch (Exception e) {
			// 记账失败不影响业务：老师要的是题目，不是「记账没成功所以整单失败」
			log.error("AI 用量记账失败（不影响本次调用）: user={}, scene={}", userId, scene, e);
		}
	}

	@Override
	public AiUsageView today() {
		String userId = SecurityContextUtils.isAuthenticated() ? SecurityContextUtils.getUserId() : null;
		SystemInfo.AiSetting setting = systemService.getSystemAiSetting();
		Date from = startOfToday();
		AiUsageView view = new AiUsageView();
		view.setUserLimit(Integer.valueOf(limit(setting == null ? null : setting.getPerUserDailyLimit(),
				DEFAULT_PER_USER_TOKEN_LIMIT)));
		view.setDailyLimit(
				Integer.valueOf(limit(setting == null ? null : setting.getDailyTokenLimit(), DEFAULT_DAILY_TOKEN_LIMIT)));
		view.setUserTokens(Long.valueOf(StringUtils.hasText(userId) ? aiUsageMapper.sumTokensByUser(userId, from) : 0L));
		view.setDailyTokens(Long.valueOf(aiUsageMapper.sumTokensSince(from)));
		List<AiUsageView.SceneUsage> scenes = new ArrayList<>();
		if (StringUtils.hasText(userId)) {
			for (Map<String, Object> row : aiUsageMapper.summaryBySceneForUser(userId, from)) {
				AiUsageView.SceneUsage scene = new AiUsageView.SceneUsage();
				scene.setScene(row.get("scene") == null ? null : String.valueOf(row.get("scene")));
				scene.setCalls(Long.valueOf(asLong(row.get("calls"))));
				scene.setTokens(Long.valueOf(asLong(row.get("tokens"))));
				scenes.add(scene);
			}
		}
		view.setScenes(scenes);
		return view;
	}

	/**
	 * 限额归一化：null → 默认值；<= 0 → 0（表示不限）；上限夹到 1 亿（再大没有实际意义，
	 * 只是防止有人把 Integer 塞成天文数字把界面占满）。
	 */
	private static int limit(Integer configured, int defaultValue) {
		if (configured == null) {
			return defaultValue;
		}
		int value = configured.intValue();
		if (value <= 0) {
			return 0;
		}
		return Math.min(value, 100_000_000);
	}

	/** 本地时区的今天零点 */
	private static Date startOfToday() {
		return Date.from(LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant());
	}

	private static long asLong(Object value) {
		return value instanceof Number number ? number.longValue() : 0L;
	}

	private static String truncate(String error) {
		if (!StringUtils.hasText(error)) {
			return null;
		}
		String text = error.trim();
		return text.length() <= MAX_ERROR_LENGTH ? text : text.substring(0, MAX_ERROR_LENGTH);
	}

}
