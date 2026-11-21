package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.AuditCleanRequest;
import cn.surveyking.server.domain.dto.AuditLogView;
import cn.surveyking.server.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;







@RestController
@RequestMapping("${api.prefix}/system/audit")
@RequiredArgsConstructor
public class AuditApi {

	private final AuditLogService auditLogService;

	@GetMapping("/list")
	@PreAuthorize("hasAuthority('system:log:list')")
	public PaginationResponse<AuditLogView> list(@RequestParam(defaultValue = "1") long current,
			@RequestParam(defaultValue = "20") long pageSize,
			@RequestParam(required = false) String action,
			@RequestParam(required = false) String startTime,
			@RequestParam(required = false) String endTime,
			@RequestParam(required = false) String operator,
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String result) {
		return auditLogService.list(current, pageSize, action, startTime, endTime, operator, keyword, result);
	}





	@GetMapping("/retention")
	@PreAuthorize("hasAuthority('system:log:list')")
	public Map<String, Object> retention() {
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("retentionDays", auditLogService.getRetentionDays());
		result.put("autoEnabled", auditLogService.isAutoCleanupEnabled());
		result.put("minKeepDays", AuditLogService.MIN_KEEP_DAYS);
		return result;
	}

	@PostMapping("/clean")
	@PreAuthorize("hasRole('admin')")
	public int clean(@RequestBody AuditCleanRequest request) {
		return auditLogService.clean(request.getBeforeDays(), request.getBefore(), Boolean.TRUE.equals(request.getAll()));
	}





	@GetMapping("/actions")
	@PreAuthorize("hasAuthority('system:log:list')")
	public List<Map<String, String>> actions() {
		return auditLogService.listActions();
	}
}
