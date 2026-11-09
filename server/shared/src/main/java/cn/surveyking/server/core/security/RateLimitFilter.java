package cn.surveyking.server.core.security;

import cn.surveyking.server.core.uitls.IPUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 题库类接口的简单限流。
 *
 * <p>
 * 要防的是「注册个账号、写脚本把题库刷一遍」这种爬库行为。按「单个用户 + 60 秒滑动窗口」计数，
 * 超过阈值直接返回 429，并打一条 warn 日志便于事后追查是谁在刷。
 *
 * <p>
 * 计数实现由 {@link RateLimiter} 承担：当前是进程内实现（单实例足够），将来换 Redis 只改 Bean。
 * 未登录请求按客户端 IP 计数，IP 统一走 {@link IPUtils}——不要再用 X-Real-IP，
 * 在 docker 反代下它是网关地址，会把所有未登录用户算成同一个人。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

	/**
	 * 批量读取类接口：单用户每分钟 60 次。
	 * 正常答题 1 分钟约 10 题，60 次留 6 倍余量，同时能挡住脚本刷全库。
	 */
	private static final String[] GUARDED_PREFIXES = { "/api/repo", "/api/template", "/api/project" };

	/**
	 * 逐题下发接口单独计数：瀑布流模式一次性并发拉全量题目，
	 * 若与上面的 60 次共用同一桶，超过 60 题的问卷会大面积 429 直接交不了卷。
	 * 这里给更高额度，仍能挡住"逐题刷全库"的极端行为。
	 */
	private static final String QUESTION_PREFIX = "/api/public/question";

	private static final long WINDOW_MS = 60_000L;

	@Value("${surveyking.rate-limit.question-max-per-minute:240}")
	private int maxQuestionPerMinute = 240;

	/**
	 * 单用户每分钟允许的题库类请求数。
	 * 正常答题 1 分钟约 10 题（每题 1 次取题），60 次留了 6 倍余量：
	 * 既能让人正常做题，又能让「脚本刷全库」在一个窗口内被挡住。
	 */
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

		// 逐题接口与批量接口分别计数，避免瀑布流被批量额度误伤
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