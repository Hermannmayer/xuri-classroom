package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.domain.model.SysInfo;
import cn.surveyking.server.mapper.SysInfoMapper;
import cn.surveyking.server.service.AnonymousIdentityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * 匿名答卷清理：每日定时 + 管理员手动。
 *
 * <p>规则（用户已确认）：
 * <ul>
 * <li>保留天数与开关存在系统设置 {@code SystemInfo.SystemSetting} 里，默认开启、保留 90 天；</li>
 * <li>定时任务每天 03:30 跑一次；管理员手动清理走 {@code POST /api/system/anonymous/cleanup}；</li>
 * <li>只清理 {@code t_answer.is_anonymous=1} 且创建时间早于 cutoff 的答卷，登录用户的答卷不碰；</li>
 * <li>清理完把「最近一次清理时间/条数」写回设置（只读展示字段）。</li>
 * </ul>
 *
 * <p>注意：写回设置后要手动失效 {@code commonCache}，否则 {@code GET /api/system} 最长要等缓存
 * TTL 才看得到新的 last 字段（与 SystemServiceImpl#updateProtection 同一个坑）。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnonymousCleanupService {

	/** 系统设置里默认保留天数 */
	public static final int DEFAULT_RETENTION_DAYS = 90;

	/** 保留天数范围，与 SystemServiceImpl 的 clamp 保持一致 */
	public static final int MIN_RETENTION_DAYS = 1;

	public static final int MAX_RETENTION_DAYS = 3650;

	/** t_sys_info 只有一条记录 */
	private static final String SYS_INFO_ID = "1";

	private final SysInfoMapper sysInfoMapper;

	private final AnonymousIdentityService anonymousIdentityService;

	private final CacheManager cacheManager;

	/**
	 * 每日 03:30 自动清理。关闭时跳过；异常只记日志，不影响调度线程。
	 */
	@Scheduled(cron = "0 30 3 * * ?")
	public void cleanupDaily() {
		SysInfo info = sysInfoMapper.selectById(SYS_INFO_ID);
		SystemInfo.SystemSetting setting = info == null ? null : info.getSetting();
		// 缺省视为开启：只有显式 false 才跳过
		if (setting != null && Boolean.FALSE.equals(setting.getAnonymousCleanupEnabled())) {
			log.info("匿名答卷自动清理已关闭，跳过");
			return;
		}
		int retentionDays = normalizeRetentionDays(setting == null ? null : setting.getAnonymousRetentionDays());
		try {
			int deleted = runNow(retentionDays);
			log.info("匿名答卷定时清理完成: retentionDays={}, deleted={}", retentionDays, deleted);
		}
		catch (Exception e) {
			// 定时任务里抛异常会被调度器吞掉，这里显式记一笔，便于排查
			log.error("匿名答卷定时清理失败", e);
		}
	}

	/**
	 * 手动清理：按当前系统设置里的保留天数执行。
	 * @return 删除的匿名答卷条数
	 */
	public int runNow() {
		SysInfo info = sysInfoMapper.selectById(SYS_INFO_ID);
		SystemInfo.SystemSetting setting = info == null ? null : info.getSetting();
		return runNow(normalizeRetentionDays(setting == null ? null : setting.getAnonymousRetentionDays()));
	}

	/**
	 * 按指定保留天数清理，并把「最近一次清理」写回系统设置。
	 * @param days 保留天数（越界会被夹到 1~3650）
	 * @return 删除的匿名答卷条数
	 */
	public int runNow(int days) {
		int retentionDays = normalizeRetentionDays(days);
		int deleted = anonymousIdentityService.purgeOlderThan(retentionDays);
		// 重新读一次再写回，减少覆盖并发保存的系统设置的概率（只改 setting 里的两个 last 字段）
		SysInfo info = sysInfoMapper.selectById(SYS_INFO_ID);
		boolean exists = info != null;
		if (!exists) {
			info = new SysInfo();
			info.setId(SYS_INFO_ID);
		}
		SystemInfo.SystemSetting setting = info.getSetting();
		if (setting == null) {
			setting = new SystemInfo.SystemSetting();
		}
		setting.setAnonymousLastCleanupAt(new Date());
		setting.setAnonymousLastCleanupCount(deleted);
		info.setSetting(setting);
		if (exists) {
			sysInfoMapper.updateById(info);
		}
		else {
			sysInfoMapper.insert(info);
		}
		evictSystemInfoCache();
		return deleted;
	}

	private void evictSystemInfoCache() {
		if (cacheManager == null) {
			return;
		}
		Cache cache = cacheManager.getCache(CacheConsts.commonCacheName);
		if (cache != null) {
			cache.clear();
		}
	}

	/** 保留天数：缺省 90，越界夹到 1~3650 */
	private int normalizeRetentionDays(Integer days) {
		if (days == null) {
			return DEFAULT_RETENTION_DAYS;
		}
		if (days < MIN_RETENTION_DAYS) {
			return MIN_RETENTION_DAYS;
		}
		if (days > MAX_RETENTION_DAYS) {
			return MAX_RETENTION_DAYS;
		}
		return days;
	}

}
