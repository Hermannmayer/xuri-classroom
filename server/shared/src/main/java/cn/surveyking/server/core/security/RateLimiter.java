package cn.surveyking.server.core.security;








public interface RateLimiter {

	/**
	 * 在 windowMillis 窗口内为 key 申请一次配额。
	 * @return true=放行；false=超限
	 */
	boolean tryAcquire(String key, int limit, long windowMillis);

}