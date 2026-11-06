package cn.surveyking.server.core.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Expiry;
import org.checkerframework.checker.index.qual.NonNegative;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurerSupport;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 使用 caffeine 自定义 cache，允许针对每个 cacheName 设置单独的 expireTime
 *
 * @author javahuang
 * @date 2021/9/8
 */
@Configuration
@EnableCaching
@ConfigurationProperties("custom-cache")
public class CacheConfig extends CachingConfigurerSupport {

	/**
	 * 没在 custom-cache.entries 里配置的缓存名回落到这个 TTL。
	 * 之前是 entries.get(name).toNanos()，名字没配就会 NPE（整个请求 500）；顺带把兜底值定成 10 分钟。
	 */
	private static final Duration DEFAULT_TTL = Duration.ofMinutes(10);

	private Map<String, Duration> entries;

	@Bean
	@Override
	public CacheManager cacheManager() {
		ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager() {

			@Override
			protected Cache createConcurrentMapCache(final String name) {
				return new ConcurrentMapCache(name, Caffeine.newBuilder().expireAfter(new Expiry<Object, Object>() {
					@Override
					public long expireAfterCreate(Object key, Object value, long currentTime) {
						Duration ttl = entries == null ? null : entries.get(name);
						return (ttl == null ? DEFAULT_TTL : ttl).toNanos();
					}

					@Override
					public long expireAfterUpdate(Object key, Object value, long currentTime,
							@NonNegative long currentDuration) {
						return currentDuration;
					}

					@Override
					public long expireAfterRead(Object key, Object value, long currentTime,
							@NonNegative long currentDuration) {
						return currentDuration;
					}
				}).maximumSize(100).build().asMap(), false);
			}
		};

		cacheManager.setCacheNames(entries.entrySet().stream().map(x -> x.getKey()).collect(Collectors.toList()));
		return cacheManager;
	}

	public Map<String, Duration> getEntries() {
		return entries;
	}

	public void setEntries(Map<String, Duration> entries) {
		this.entries = entries;
	}

}
