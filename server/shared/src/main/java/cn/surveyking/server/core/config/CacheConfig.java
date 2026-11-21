package cn.surveyking.server.core.config;

import cn.surveyking.server.core.constant.CacheConsts;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Expiry;
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
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;







@Configuration
@EnableCaching
@ConfigurationProperties("custom-cache")
public class CacheConfig extends CachingConfigurerSupport {





	private static final Duration DEFAULT_TTL = Duration.ofMinutes(10);









	private static final Map<String, Long> DEFAULT_SIZES = new HashMap<>();

	static {
		DEFAULT_SIZES.put(CacheConsts.userCacheName, 10_000L);
		DEFAULT_SIZES.put(CacheConsts.projectPermissionCacheName, 10_000L);
		DEFAULT_SIZES.put(CacheConsts.projectCache, 2_000L);
		DEFAULT_SIZES.put(CacheConsts.fileCacheName, 1_000L);
		DEFAULT_SIZES.put(CacheConsts.oauthFlowCacheName, 10_000L);
		DEFAULT_SIZES.put(CacheConsts.deptCacheName, 200L);
		DEFAULT_SIZES.put(CacheConsts.commonCacheName, 200L);
	}


	private Map<String, Long> sizes;

	private Map<String, Duration> entries;

	@Bean
	@Override
	public CacheManager cacheManager() {
		ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager() {

			@Override
			protected Cache createConcurrentMapCache(final String name) {
				long maximumSize = (sizes != null && sizes.get(name) != null) ? sizes.get(name)
						: DEFAULT_SIZES.getOrDefault(name, 1_000L);
				return new ConcurrentMapCache(name, Caffeine.newBuilder().maximumSize(maximumSize)
						.expireAfter(new Expiry<Object, Object>() {
					@Override
					public long expireAfterCreate(Object key, Object value, long currentTime) {
						Duration ttl = entries == null ? null : entries.get(name);
						return (ttl == null ? DEFAULT_TTL : ttl).toNanos();
					}

					@Override
					public long expireAfterUpdate(Object key, Object value, long currentTime,
							long currentDuration) {
						return currentDuration;
					}

					@Override
					public long expireAfterRead(Object key, Object value, long currentTime,
							long currentDuration) {
						return currentDuration;
					}
						}).build().asMap(), false);
			}
		};


		cacheManager.setCacheNames(entries == null ? Collections.emptyList()
				: entries.keySet().stream().collect(Collectors.toList()));
		return cacheManager;
	}

	public Map<String, Long> getSizes() {
		return sizes;
	}

	public void setSizes(Map<String, Long> sizes) {
		this.sizes = sizes;
	}

	public Map<String, Duration> getEntries() {
		return entries;
	}

	public void setEntries(Map<String, Duration> entries) {
		this.entries = entries;
	}

}