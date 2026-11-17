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

/**
 * 把 Controller 的写操作记进审计日志。见 {@link AuditRecorder} 的说明。
 *
 * <p>2.2.3 起高危动作（清单在 {@link AuditDiffSupport}）还要带「改前 / 改后」快照：
 * 改前必须在 {@code joinPoint.proceed()} <b>之前</b>采集，删除类动作执行完目标行就查不到了；
 * 改后等业务成功返回后再读一次。业务抛异常时只记「改前」，正好说明「改到一半失败了」。
 */
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
		// 登录、公开答题、验证码：高频且不属于后台审计范围。
		// 验证码的真实路径是 /captcha/**（nginx 直接转发），不是 /api/captcha。
		if (uri == null || uri.startsWith("/api/public") || uri.startsWith("/captcha")) {
			return joinPoint.proceed();
		}

		MethodSignature signature = (MethodSignature) joinPoint.getSignature();
		String where = signature.getDeclaringType().getSimpleName() + "#" + signature.getName();
		String method = request.getMethod();
		String action = AuditRecorder.actionOf(uri);
		// 目标 id 优先用快照解析出来的：批改请求的目标是答卷（answerId 而不是 id），批量动作取第一条
		String diffTargetId = diffSupport.targetIdOf(action, joinPoint.getArgs());
		String targetId = StringUtils.hasText(diffTargetId) ? diffTargetId
				: AuditRecorder.targetIdOf(joinPoint.getArgs());
		// 删除类必须在 proceed 之前解析目标名称：执行完对象就查不到了
		String targetName = targetResolver.resolve(uri, joinPoint.getArgs());
		String detail = method + " " + uri + " · " + where;
		// 高危动作的「改前」：非高危动作这里是 null，退化成普通审计
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
