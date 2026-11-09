package cn.surveyking.server.core.security;

/**
 * 限流器抽象。
 *
 * <p>
 * 当前只有单实例实现（进程内滑动窗口）。做成接口是为了将来横向扩容时换成 Redis 实现，
 * 调用方（{@link RateLimitFilter}）不需要改。
 */
public interface RateLimiter {

	/**
	 * 在 windowMillis 窗口内为 key 申请一次配额。
	 * @return true=放行；false=超限
	 */
	boolean tryAcquire(String key, int limit, long windowMillis);

}