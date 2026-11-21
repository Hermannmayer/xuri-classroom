package cn.surveyking.server.core.audit;

import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;








@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

	private final AuditRecorder auditRecorder;

	private final AuditTargetResolver targetResolver;

	private final AuditDiffSupport diffSupport;

	@Around("within(cn.surveyking.server.api..*) && ("
			+ "@annotation(org.springframework.web.bind.annotation.PostMapping) || "
			+ "@annotation(org.springframework.web.bind.annotation.PutMapping) || "
			+ "@annotation(org.springframework.web.bind.annotation.DeleteMapping) || "
			+ "@annotation(org.springframework.web.bind.annotation.PatchMapping))")
	public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
		HttpServletRequest request = currentRequest();
		String uri = request == null ? null : request.getRequestURI();


		if (uri == null || uri.startsWith("/api/public") || uri.startsWith("/captcha")) {
			return joinPoint.proceed();
		}

		MethodSignature signature = (MethodSignature) joinPoint.getSignature();
		String where = signature.getDeclaringType().getSimpleName() + "#" + signature.getName();
		String method = request.getMethod();
		String action = AuditRecorder.actionOf(uri);

		String diffTargetId = diffSupport.targetIdOf(action, joinPoint.getArgs());
		String targetId = StringUtils.hasText(diffTargetId) ? diffTargetId
				: AuditRecorder.targetIdOf(joinPoint.getArgs());

		String targetName = targetResolver.resolve(uri, joinPoint.getArgs());
		String detail = method + " " + uri + " · " + where;

		Map<String, Object> before = diffSupport.snapshot(action, joinPoint.getArgs());

		try {
			Object result = joinPoint.proceed();
			Map<String, Object> after = before == null ? null : diffSupport.snapshot(action, joinPoint.getArgs());
			auditRecorder.recordWithDiff(action, targetId, targetName, detail + " · 成功", true, null, before, after);
			return result;
		}
		catch (Throwable t) {
			auditRecorder.recordWithDiff(action, targetId, targetName, detail, false, t.getClass().getSimpleName(), before,
					null);
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
