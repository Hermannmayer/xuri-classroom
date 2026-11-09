package cn.surveyking.server.core.security;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 进程内滑动窗口限流。
 *
 * <p>
 * 单实例部署足够；多实例时每个实例各自计数，实际配额是 实例数 × limit。
 * 要精确全局配额，换 Redis 实现即可（见 {@link RateLimiter}）。
 */
@Component
public class InMemoryRateLimiter implements RateLimiter {

	private final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();

	/** 避免 windows 无限增长：超过这个 key 数量时清一次过期窗口 */
	private static final int CLEAN_THRESHOLD = 5_000;

	@Override
	public boolean tryAcquire(String key, int limit, long windowMillis) {
		long now = System.currentTimeMillis();
		if (windows.size() > CLEAN_THRESHOLD) {
			cleanup(now, windowMillis);
		}
		Deque<Long> window = windows.computeIfAbsent(key, k -> new ArrayDeque<>());
		int hits;
		synchronized (window) {
			while (!window.isEmpty() && now - window.peekFirst() > windowMillis) {
				window.pollFirst();
			}
			hits = window.size();
			if (hits < limit) {
				window.addLast(now);
			}
		}
		return hits < limit;
	}

	private void cleanup(long now, long windowMillis) {
		windows.entrySet().removeIf(entry -> {
			Deque<Long> window = entry.getValue();
			synchronized (window) {
				return window.isEmpty() || now - window.peekLast() > windowMillis;
			}
		});
	}

}