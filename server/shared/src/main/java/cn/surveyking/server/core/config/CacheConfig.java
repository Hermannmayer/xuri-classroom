package cn.surveyking.server.core.config;

import cn.surveyking.server.core.constant.CacheConsts;
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
import java.util.HashMap;
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

	/**
	 * 每个缓存名的条目上限。
	 * <p>
	 * 之前所有缓存统一 {@code maximumSize(100)}：500 人同时在线时 userCache 只能装 100 个用户，
	 * 命中率接近 0，而每个已登录请求都要走 {@code loadUserById}（约 5~6 次查询）——
	 * 等于把鉴权变成了每请求一次的数据库风暴。容量按「体积小、读多写少」的原则给：
	 * 用户与项目权限给足，组织结构与全局配置本来就只有几十条。
	 */
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

	/** 可选覆盖：custom-cache.sizes.<cacheName>=条目数 */
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
							@NonNegative long currentDuration) {
						return currentDuration;
					}

					@Override
					public long expireAfterRead(Object key, Object value, long currentTime,
							@NonNegative long currentDuration) {
						return currentDuration;
					}
						}).build().asMap(), false);
			}
		};

		cacheManager.setCacheNames(entries.entrySet().stream().map(x -> x.getKey()).collect(Collectors.toList()));
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
