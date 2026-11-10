package cn.surveyking.server.core.audit;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.mapper.AuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;

/**
 * 统一审计：把所有「写操作」记进 t_audit_log。
 *
 * <p>之前只有查询服务、没有写入方，所以「操作日志」页面永远是空的；导出题库那些动作也
 * 只在文档里写过、代码里没实现。这里用 AOP 统一兜住：
 *
 * <ul>
 * <li>范围：`cn.surveyking.server.api` 下所有 `@PostMapping/@PutMapping/@DeleteMapping/@PatchMapping`</li>
 * <li>排除：`/api/public/**`（登录、公开答题、暂存草稿，量大且无审计价值）与 `/api/captcha/**`</li>
 * <li>记录：动作码（由 URI 生成）、目标 id（反射取参数里的 id）、失败原因、操作人、IP</li>
 * </ul>
 *
 * <p>审计写失败绝不影响业务：所有异常都被吞掉，只打日志。
 */
@Component
@RequiredArgsConstructor
public class AuditRecorder {

	private static final Logger log = LoggerFactory.getLogger(AuditRecorder.class);

	private final AuditLogMapper auditLogMapper;

	/** 由 URI 生成动作码，例如 /api/system/role/update → SYSTEM_ROLE_UPDATE */
	public static String actionOf(String uri) {
		String path = uri == null ? "" : uri;
		if (path.startsWith("/api/")) {
			path = path.substring(5);
		}
		String code = path.replaceAll("[^A-Za-z0-9]+", "_").toUpperCase();
		code = code.replaceAll("^_+|_+$", "");
		if (code.length() > 60) {
			code = code.substring(0, 60);
		}
		return code.isEmpty() ? "UNKNOWN" : code;
	}

	/** 从方法参数里尽力取一个 id（约定：DTO 上有 getId()） */
	public static String targetIdOf(Object[] args) {
		if (args == null) {
			return null;
		}
		for (Object arg : args) {
			if (arg == null || arg instanceof CharSequence || arg instanceof Number) {
				continue;
			}
			try {
				Method getId = arg.getClass().getMethod("getId");
				Object id = getId.invoke(arg);
				if (id != null) {
					return String.valueOf(id);
				}
			}
			catch (Exception ignored) {
				// 没有 getId 就算了，审计不能因此失败
			}
		}
		return null;
	}

	/** 兼容旧调用：不记录目标名称 / 操作人，由安全上下文兜底 */
	public void record(String action, String targetId, String detail, boolean success, String error) {
		record(action, targetId, null, detail, success, error, null);
	}

	/** 带目标名称的重载 */
	public void record(String action, String targetId, String targetName, String detail, boolean success,
			String error) {
		record(action, targetId, targetName, detail, success, error, null);
	}

	/**
	 * 写一条审计。
	 *
	 * @param targetName 目标名称；由 {@link AuditTargetResolver} 在业务执行前解析，可为空
	 * @param operatorId 操作人 id；登录成功这类「安全上下文里还没有用户」的场景由调用方显式传入
	 */
	public void record(String action, String targetId, String targetName, String detail, boolean success,
			String error, String operatorId) {
		try {
			AuditLog entry = new AuditLog();
			entry.setAction(action);
			entry.setTargetId(truncate(targetId, 64));
			entry.setTargetName(truncate(targetName, 256));
			entry.setDetail(truncate(success ? detail : detail + " · 失败：" + error, 500));
			entry.setIp(clientIp());
			String operator = StringUtils.hasText(operatorId) ? operatorId : null;
			if (!StringUtils.hasText(operator)) {
				// 登录场景没有 SecurityContext，只能靠调用方传 operatorId；其余场景这里显式落一次
				String currentUserId = SecurityContextUtils.getUserId();
				if (StringUtils.hasText(currentUserId) && !AppConsts.ANONYMOUS_USER_ID.equals(currentUserId)) {
					operator = currentUserId;
				}
			}
			if (StringUtils.hasText(operator)) {
				entry.setCreateBy(operator);
			}
			auditLogMapper.insert(entry);
		}
		catch (Exception e) {
			log.warn("写审计日志失败 action={} detail={}", action, detail, e);
		}
	}

	private static String truncate(String s, int max) {
		if (s == null) {
			return null;
		}
		return s.length() <= max ? s : s.substring(0, max);
	}

	private static String clientIp() {
		try {
			ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
			if (attrs == null) {
				return null;
			}
			return cn.surveyking.server.core.uitls.IPUtils.getClientIpAddress(attrs.getRequest());
		}
		catch (Exception e) {
			return null;
		}
	}

}
