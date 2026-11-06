package cn.surveyking.server.core.security;

import cn.surveyking.server.core.uitls.SecurityContextUtils;
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
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 题库类接口的简单限流。
 *
 * <p>要防的是「注册个账号、写脚本把题库刷一遍」这种爬库行为。按「单个用户 + 60 秒滑动窗口」计数，
 * 超过阈值直接返回 429，并打一条 warn 日志便于事后追查是谁在刷。
 *
 * <p>刻意不引 Redis：这套系统是单实例部署，本地内存计数足够，也省掉一个依赖。
 * 如果以后要横向扩容，把 {@link #WINDOWS} 换成 Redis 的滑动窗口即可。
 *
 * <p>只拦题库/项目类读接口，登录、答题提交、上传等不受影响。
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

	/** 命中限流的接口前缀 */
	private static final String[] GUARDED_PREFIXES = { "/api/repo", "/api/template", "/api/project" };

	/** 每个用户保留一个 60 秒窗口的请求时间戳队列 */
	private static final Map<String, Deque<Long>> WINDOWS = new ConcurrentHashMap<>();

	private static final long WINDOW_MS = 60_000L;

	/** 单用户每分钟允许的题库类请求数，可用 surveyking.rate-limit.max-per-minute 覆盖 */
	@Value("${surveyking.rate-limit.max-per-minute:300}")
	private int maxPerMinute = 300;

	/** 避免 WINDOWS 无限增长：超过这个用户量时清一次过期用户 */
	private static final int CLEAN_THRESHOLD = 5_000;

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		String uri = request.getRequestURI();
		if (uri == null) {
			return true;
		}
		boolean guarded = false;
		for (String prefix : GUARDED_PREFIXES) {
			if (uri.startsWith(prefix)) {
				guarded = true;
				break;
			}
		}
		// 未登录（匿名答题等）不计数，登录校验交给后面的 Security 链
		return !guarded || !SecurityContextUtils.isAuthenticated();
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String userId = SecurityContextUtils.getUserId();
		long now = System.currentTimeMillis();

		if (WINDOWS.size() > CLEAN_THRESHOLD) {
			cleanup(now);
		}

		Deque<Long> window = WINDOWS.computeIfAbsent(userId, key -> new ArrayDeque<>());
		int hits;
		synchronized (window) {
			while (!window.isEmpty() && now - window.peekFirst() > WINDOW_MS) {
				window.pollFirst();
			}
			hits = window.size();
			if (hits < maxPerMinute) {
				window.addLast(now);
			}
		}

		if (hits >= maxPerMinute) {
			log.warn("rate limit exceeded: userId={}, uri={}, hits={}/{} per minute", userId,
					request.getRequestURI(), hits, maxPerMinute);
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

	private void cleanup(long now) {
		WINDOWS.entrySet().removeIf(entry -> {
			Deque<Long> window = entry.getValue();
			synchronized (window) {
				return window.isEmpty() || now - window.peekLast() > WINDOW_MS;
			}
		});
	}
}
