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

/**
 * 操作审计日志查询。
 *
 * <p>配合「导出密码」使用：谁在什么时候导出了哪个题库/哪份答卷，都能在这里查到。
 * 只有具备 system:log:list 的人（默认仅管理员）能看。
 */
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

	/**
	 * 当前生效的保留策略：给日志页显示「自动保留 N 天」用。
	 * @return retentionDays（0 表示关闭自动清理）、autoEnabled、minKeepDays
	 */
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

	/**
	 * 筛选下拉用的动作字典：库里实际出现过的动作码 + 中文名。
	 * 新接口上线后即使字典没更新，下拉里也会出现原始动作码，不会缺项。
	 */
	@GetMapping("/actions")
	@PreAuthorize("hasAuthority('system:log:list')")
	public List<Map<String, String>> actions() {
		return auditLogService.listActions();
	}
}
