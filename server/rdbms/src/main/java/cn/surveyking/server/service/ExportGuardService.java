package cn.surveyking.server.service;

import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.mapper.AuditLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 导出管控：密码校验 + 审计记录。
 *
 * <p>用户明确选择用「导出密码 + 审计日志」替代数据库字段加密：
 * 加密对「能读服务器文件」的人无效，而导出才是题目外流的主要路径。
 *
 * <p>密码存在系统设置 {@code setting.exportPassword}，为空表示不启用；
 * 无论是否启用密码，具备导出权限的人导出成功都会留下一条审计记录。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExportGuardService {

	/** 动作常量 */
	public static final String EXPORT_REPO = "EXPORT_REPO";

	public static final String EXPORT_ANSWER = "EXPORT_ANSWER";

	public static final String IMPORT_REPO = "IMPORT_REPO";

	private final AuditLogMapper auditLogMapper;

	private final cn.surveyking.server.mapper.SysInfoMapper sysInfoMapper;

	/**
	 * 校验导出密码。设置里没配密码时直接放行（仍受权限注解约束）。
	 *
	 * <p>注意：这里必须直接读 SysInfo 原始记录，不能走 {@code systemService.getSystemInfo()}——
	 * 后者为了安全会把密码置空（公开接口不回显），走它会导致密码校验永远通过。
	 */
	public void assertExportAllowed(String provided) {
		cn.surveyking.server.domain.model.SysInfo info = sysInfoMapper.selectById("1");
		String expected = info != null && info.getSetting() != null ? info.getSetting().getExportPassword() : null;
		if (!StringUtils.hasText(expected)) {
			return;
		}
		if (!expected.equals(provided == null ? null : provided.trim())) {
			throw new cn.surveyking.server.core.exception.ErrorCodeException(
					cn.surveyking.server.core.constant.ErrorCode.ExportPasswordError);
		}
	}

	/** 记一条审计日志；失败不影响导出本身 */
	public void record(String action, String targetId, String targetName, String detail) {
		try {
			AuditLog log = new AuditLog();
			log.setAction(action);
			log.setTargetId(targetId);
			log.setTargetName(targetName);
			log.setDetail(detail);
			log.setIp(currentIp());
			auditLogMapper.insert(log);
		}
		catch (Exception e) {
			ExportGuardService.log.warn("写入审计日志失败: action={}, target={}", action, targetId, e);
		}
	}

	private String currentIp() {
		try {
			org.springframework.web.context.request.ServletRequestAttributes attrs = (org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder
					.getRequestAttributes();
			if (attrs == null) {
				return null;
			}
			javax.servlet.http.HttpServletRequest request = attrs.getRequest();
			String real = request.getHeader("X-Real-IP");
			return StringUtils.hasText(real) ? real : request.getRemoteAddr();
		}
		catch (Exception e) {
			return null;
		}
	}

	/** 当前操作人（审计里 create_by 由 BaseModel 自动填充，这里仅用于日志文本） */
	public String currentUser() {
		return SecurityContextUtils.isAuthenticated() ? SecurityContextUtils.getUserId() : "anonymous";
	}

}
