package cn.surveyking.server.core.security;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;








@Component
public class InMemoryRateLimiter implements RateLimiter {

	private final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();


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