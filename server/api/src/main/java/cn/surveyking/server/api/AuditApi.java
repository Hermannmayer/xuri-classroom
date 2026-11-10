package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.AuditLogView;
import cn.surveyking.server.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
			@RequestParam(required = false) String action) {
		return auditLogService.list(current, pageSize, action);
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
