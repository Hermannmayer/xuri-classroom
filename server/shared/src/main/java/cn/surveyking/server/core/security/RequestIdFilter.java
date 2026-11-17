package cn.surveyking.server.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * 给每个请求一个 request id，写进 MDC 与响应头。
 *
 * <p>
 * 审计表里的 {@code request_id} 原本一直是 null：计划 §5.1 想解决「同一次请求能否串起来」，
 * 但仓库里没有任何地方生成或透传它，光在 AuditRecorder 里读 MDC 是读不到的。
 * 这里按约定顺序取值：入站 {@code X-Request-Id} → MDC 里已有的值 → 新生成。
 * 回写同名响应头，排障时把浏览器/devtools 里的 id 拿去 grep 日志与审计表即可。
 *
 * <p>
 * 顺序放在最前（{@link Ordered#HIGHEST_PRECEDENCE}），保证审计切面与业务日志都能读到。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

	public static final String HEADER = "X-Request-Id";

	public static final String MDC_KEY = "requestId";

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String requestId = request.getHeader(HEADER);
		if (!StringUtils.hasText(requestId)) {
			requestId = UUID.randomUUID().toString().replace("-", "");
		}
		if (requestId.length() > 64) {
			requestId = requestId.substring(0, 64);
		}
		MDC.put(MDC_KEY, requestId);
		response.setHeader(HEADER, requestId);
		try {
			chain.doFilter(request, response);
		}
		finally {
			MDC.remove(MDC_KEY);
		}
	}

}
