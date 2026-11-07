package cn.surveyking.server.core.audit;

import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;

/**
 * 把 Controller 的写操作记进审计日志。见 {@link AuditRecorder} 的说明。
 */
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

	private final AuditRecorder auditRecorder;

	@Around("within(cn.surveyking.server.api..*) && ("
			+ "@annotation(org.springframework.web.bind.annotation.PostMapping) || "
			+ "@annotation(org.springframework.web.bind.annotation.PutMapping) || "
			+ "@annotation(org.springframework.web.bind.annotation.DeleteMapping) || "
			+ "@annotation(org.springframework.web.bind.annotation.PatchMapping))")
	public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
		HttpServletRequest request = currentRequest();
		String uri = request == null ? null : request.getRequestURI();
		// 登录、公开答题、验证码：高频且不属于后台审计范围
		if (uri == null || uri.startsWith("/api/public") || uri.startsWith("/api/captcha")) {
			return joinPoint.proceed();
		}

		MethodSignature signature = (MethodSignature) joinPoint.getSignature();
		String where = signature.getDeclaringType().getSimpleName() + "#" + signature.getName();
		String method = request.getMethod();
		String action = AuditRecorder.actionOf(uri);
		String targetId = AuditRecorder.targetIdOf(joinPoint.getArgs());
		String detail = method + " " + uri + " · " + where;

		try {
			Object result = joinPoint.proceed();
			auditRecorder.record(action, targetId, detail + " · 成功", true, null);
			return result;
		}
		catch (Throwable t) {
			auditRecorder.record(action, targetId, detail, false, t.getClass().getSimpleName());
			throw t;
		}
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

}
