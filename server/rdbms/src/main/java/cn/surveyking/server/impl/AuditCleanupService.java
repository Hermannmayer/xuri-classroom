package cn.surveyking.server.impl;

import cn.surveyking.server.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;













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

			log.warn("[audit] 自动清理失败：keepDays={}", keepDays, e);
		}
	}

}
