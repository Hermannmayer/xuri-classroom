package cn.surveyking.server.impl;

import cn.surveyking.server.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * 审计日志的自动保留清理。
 *
 * <p>
 * 手动清理（系统设置 → 操作日志 → 清理日志）一直都在，缺的是「不清理就一直涨」这件事的兜底：
 * 审计表没有 TTL，学校用两三个学期后几十万行，查询和备份都会变慢。这里按
 * {@code sk.audit.retention-days}（默认 180 天，配置成 0 或负数即关闭）每天凌晨跑一次，
 * 删除更早的记录；删除本身走 {@link AuditLogService#clean} 的分批逻辑，不会长时间锁表。
 *
 * <p>
 * 与其它清理任务错开时间：匿名答卷 03:30、孤儿文件 03:47，这里 04:12。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditCleanupService {

	private final AuditLogService auditLogService;

	@Scheduled(cron = "0 12 4 * * ?")
	public void scheduledCleanup() {
		if (!auditLogService.isAutoCleanupEnabled()) {
			return;
		}
		int keepDays = auditLogService.getRetentionDays();
		try {
			int deleted = auditLogService.clean(keepDays, null, false);
			if (deleted > 0) {
				log.info("[audit] 自动清理完成：保留 {} 天，删除 {} 条", keepDays, deleted);
			}
		}
		catch (Exception e) {
			// 清理失败不能影响任何业务，也不能让调度线程挂掉
			log.warn("[audit] 自动清理失败：keepDays={}", keepDays, e);
		}
	}

}
