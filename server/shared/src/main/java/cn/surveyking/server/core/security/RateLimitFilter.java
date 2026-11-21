package cn.surveyking.server.core.security;

import cn.surveyking.server.core.uitls.IPUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;













@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {





	private static final String[] GUARDED_PREFIXES = { "/api/repo", "/api/template", "/api/project" };






	private static final String QUESTION_PREFIX = "/api/public/question";

	private static final long WINDOW_MS = 60_000L;

	@Value("${surveyking.rate-limit.question-max-per-minute:240}")
	private int maxQuestionPerMinute = 240;






	@Value("${surveyking.rate-limit.max-per-minute:60}")
	private int maxPerMinute = 60;

	private final RateLimiter rateLimiter;

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		String uri = request.getRequestURI();
		if (uri == null) {
			return true;
		}
		if (uri.startsWith(QUESTION_PREFIX)) {
			return false;
		}
		for (String prefix : GUARDED_PREFIXES) {
			if (uri.startsWith(prefix)) {
				return false;
			}
		}
		return true;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String userId;
		if (SecurityContextUtils.isAuthenticated()) {
			userId = SecurityContextUtils.getUserId();
		}
		else {
			userId = "ip:" + IPUtils.getClientIpAddress(request);
		}


		boolean isQuestionApi = request.getRequestURI().startsWith(QUESTION_PREFIX);
		int limit = isQuestionApi ? maxQuestionPerMinute : maxPerMinute;
		String bucketKey = isQuestionApi ? userId + "|q" : userId;

		if (!rateLimiter.tryAcquire(bucketKey, limit, WINDOW_MS)) {
			log.warn("rate limit exceeded: userId={}, uri={}, limit={}/minute", userId, request.getRequestURI(), limit);
			writeTooManyRequests(response);
			return;
		}
		chain.doFilter(request, response);
	}

	/** 和全局响应保持一致的信封格式：{code,message,data}，HTTP 状态用 429 便于前端/网关识别 */
	private void writeTooManyRequests(HttpServletResponse response) throws IOException {
		response.setStatus(429);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setContentType("application/json;charset=UTF-8");
		response.getWriter().write("{\"code\":4290,\"message\":\"请求过于频繁，请稍后再试\",\"data\":null}");
	}

}