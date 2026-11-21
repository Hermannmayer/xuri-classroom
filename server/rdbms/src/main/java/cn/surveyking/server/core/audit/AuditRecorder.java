package cn.surveyking.server.core.audit;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.mapper.AuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;






















@Component
@RequiredArgsConstructor
public class AuditRecorder {

	private static final Logger log = LoggerFactory.getLogger(AuditRecorder.class);


	static final int SNAPSHOT_MAX_BYTES = 2048;


	private static final int SNAPSHOT_PREVIEW_BYTES = 1500;


	private static final String[] REQUEST_ID_MDC_KEYS = { "requestId", "request_id", "traceId", "trace_id" };


	private static final String REQUEST_ID_HEADER = "X-Request-Id";






	private static final String MCP_PREFIX = "/mcp";

	private final AuditLogMapper auditLogMapper;


	private final ObjectMapper objectMapper;

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

	/** 写一条审计 */
	public void record(String action, String targetId, String targetName, String detail, boolean success,
			String error, String operatorId) {
		write(action, targetId, targetName, detail, success, error, operatorId, null, null);
	}

	/** 写一条带「改前 / 改后」快照的审计（计划 §5.3 的高危动作） */
	public void recordWithDiff(String action, String targetId, Object before, Object after) {
		write(action, targetId, null, null, true, null, null, before, after);
	}

	/** 带目标名称 / 失败原因的完整重载，切面在业务失败时用它记「只有改前」的快照 */
	public void recordWithDiff(String action, String targetId, String targetName, String detail, boolean success,
			String error, Object before, Object after) {
		write(action, targetId, targetName, detail, success, error, null, before, after);
	}

	private void write(String action, String targetId, String targetName, String detail, boolean success, String error,
			String operatorId, Object before, Object after) {
		try {
			AuditLog entry = new AuditLog();
			entry.setAction(action);
			entry.setTargetId(truncate(targetId, 64));
			entry.setTargetName(truncate(targetName, 256));
			entry.setDetail(truncate(success ? detail : detail + " · 失败：" + error, 500));
			entry.setBeforeJson(snapshotJson(before));
			entry.setAfterJson(snapshotJson(after));
			entry.setSource(sourceOf());
			entry.setRequestId(requestIdOf());
			entry.setIp(clientIp());
			String operator = StringUtils.hasText(operatorId) ? operatorId : null;
			if (!StringUtils.hasText(operator)) {

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

	/** 快照序列化：null 原样返回；超过 2KB 时改写成 {"_truncated":true,"_bytes":N,"_preview":"..."} */
	private String snapshotJson(Object snapshot) {
		if (snapshot == null) {
			return null;
		}
		try {
			String json = objectMapper.writeValueAsString(snapshot);
			int bytes = utf8Length(json);
			if (bytes <= SNAPSHOT_MAX_BYTES) {
				return json;
			}
			Map<String, Object> envelope = new LinkedHashMap<>();
			envelope.put("_truncated", true);
			envelope.put("_bytes", bytes);
			envelope.put("_preview", cutUtf8(json, SNAPSHOT_PREVIEW_BYTES));
			return objectMapper.writeValueAsString(envelope);
		}
		catch (Exception e) {
			log.warn("序列化审计快照失败 type={}", snapshot.getClass().getName(), e);
			return null;
		}
	}

	/** 入口来源：/api/mcp/** 记 mcp，其余 web；没有请求上下文（后台线程）时留空，交给库里的默认值 */
	private static String sourceOf() {
		String path = requestPath();
		if (!StringUtils.hasText(path)) {
			return null;
		}
		String normalized = path.startsWith("/api/") ? path.substring(4) : path;
		return normalized.startsWith(MCP_PREFIX) ? "mcp" : "web";
	}

	/** 同一次请求的关联 id：先看 MDC，再看请求头，都没有就 null */
	private static String requestIdOf() {
		for (String key : REQUEST_ID_MDC_KEYS) {
			String value = MDC.get(key);
			if (StringUtils.hasText(value)) {
				return truncate(value.trim(), 64);
			}
		}
		HttpServletRequest request = currentRequest();
		if (request == null) {
			return null;
		}
		String header = request.getHeader(REQUEST_ID_HEADER);
		return StringUtils.hasText(header) ? truncate(header.trim(), 64) : null;
	}

	/** 当前请求路径（去掉 query 部分）；没有请求上下文返回 null */
	private static String requestPath() {
		HttpServletRequest request = currentRequest();
		if (request == null) {
			return null;
		}
		String uri = request.getRequestURI();
		if (!StringUtils.hasText(uri)) {
			return null;
		}
		int queryIndex = uri.indexOf('?');
		return queryIndex >= 0 ? uri.substring(0, queryIndex) : uri;
	}

	private static String truncate(String s, int max) {
		if (s == null) {
			return null;
		}
		return s.length() <= max ? s : s.substring(0, max);
	}

	private static int utf8Length(String text) {
		return text.getBytes(StandardCharsets.UTF_8).length;
	}

	/** 按 UTF-8 字节数裁前缀：不把多字节字符（含 emoji 的代理对）切一半 */
	private static String cutUtf8(String text, int maxBytes) {
		int bytes = 0;
		int index = 0;
		while (index < text.length()) {
			int codePoint = text.codePointAt(index);
			int size = utf8Size(codePoint);
			if (bytes + size > maxBytes) {
				break;
			}
			bytes += size;
			index += Character.charCount(codePoint);
		}
		return text.substring(0, index);
	}

	private static int utf8Size(int codePoint) {
		if (codePoint < 0x80) {
			return 1;
		}
		if (codePoint < 0x800) {
			return 2;
		}
		if (codePoint < 0x10000) {
			return 3;
		}
		return 4;
	}

	private static HttpServletRequest currentRequest() {
		try {
			ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
			return attrs == null ? null : attrs.getRequest();
		}
		catch (Exception e) {
			return null;
		}
	}

	private static String clientIp() {
		try {
			HttpServletRequest request = currentRequest();
			if (request == null) {
				return null;
			}
			return cn.surveyking.server.core.uitls.IPUtils.getClientIpAddress(request);
		}
		catch (Exception e) {
			return null;
		}
	}

}