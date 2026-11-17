package cn.surveyking.server.core.config;

import com.anji.captcha.service.CaptchaCacheService;
import com.anji.captcha.service.CaptchaService;
import com.anji.captcha.service.impl.CaptchaServiceFactory;
import com.anji.captcha.util.ImageUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.util.StreamUtils;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

/**
 * 验证码装配。
 *
 * <p>
 * 迁移到 Spring Boot 4 / Jakarta 后，{@code spring-boot-starter-captcha} 不能再用了：
 * 它的 {@code META-INF/spring.factories} 自动配置在 Boot 3 起就不再被读取，而且它的
 * {@code CaptchaController} 是 {@code javax.servlet} 写的，加载即报错。
 * 这里把原 starter 的两段装配（服务实例 + 缓存实例）按同样的语义重写一遍，
 * 只依赖零 servlet 依赖的 {@code captcha-1.3.0} 核心包。
 */
@Configuration
@EnableConfigurationProperties(CaptchaProperties.class)
public class CaptchaConfig {

	private static final Logger log = LoggerFactory.getLogger(CaptchaConfig.class);

	private static final String CLASSPATH_PREFIX = "classpath:";

	@Bean
	public CaptchaService captchaService(CaptchaProperties properties) {
		Properties anji = toAnjiProperties(properties);
		String jigsaw = properties.getJigsaw();
		String picClick = properties.getPicClick();
		// 与原 starter 一致：底图走 classpath 时先把图片读进内存缓存（首次启动会慢一点）
		if ((StringUtils.hasText(jigsaw) && jigsaw.startsWith(CLASSPATH_PREFIX))
				|| (StringUtils.hasText(picClick) && picClick.startsWith(CLASSPATH_PREFIX))) {
			anji.put("captcha.init.original", "true");
			initializeBaseMap(jigsaw, picClick);
		}
		return CaptchaServiceFactory.getInstance(anji);
	}

	@Bean
	public CaptchaCacheService captchaCacheService(CaptchaProperties properties) {
		return CaptchaServiceFactory.getCache(properties.getCacheType());
	}

	/**
	 * 把配置映射成 aj-captcha 核心包认识的 Properties 键（键名来自 1.3.0 的默认装配逻辑）。
	 */
	private static Properties toAnjiProperties(CaptchaProperties p) {
		Properties props = new Properties();
		props.put("captcha.type", p.getType());
		props.put("captcha.cacheType", p.getCacheType());
		props.put("captcha.water.mark", nullToEmpty(p.getWaterMark()));
		props.put("captcha.water.font", nullToEmpty(p.getWaterFont()));
		props.put("captcha.font.type", nullToEmpty(p.getFontType()));
		props.put("captcha.font.size", String.valueOf(p.getFontSize()));
		props.put("captcha.font.style", String.valueOf(p.getFontStyle()));
		props.put("captcha.word.count", String.valueOf(p.getClickWordCount()));
		props.put("captcha.slip.offset", nullToEmpty(p.getSlipOffset()));
		props.put("captcha.aes.status", String.valueOf(p.getAesStatus()));
		props.put("captcha.interference.options", nullToEmpty(p.getInterferenceOptions()));
		props.put("captcha.cache.number", nullToEmpty(p.getCacheNumber()));
		props.put("captcha.timing.clear", nullToEmpty(p.getTimingClear()));
		props.put("captcha.captchaOriginalPath.jigsaw", nullToEmpty(p.getJigsaw()));
		props.put("captcha.captchaOriginalPath.pic-click", nullToEmpty(p.getPicClick()));
		props.put("captcha.history.data.clear.enable", p.isHistoryDataClearEnable() ? "1" : "0");
		props.put("captcha.req.frequency.limit.enable", p.isReqFrequencyLimitEnable() ? "1" : "0");
		props.put("captcha.req.get.lock.limit", String.valueOf(p.getReqGetLockLimit()));
		props.put("captcha.req.get.lock.seconds", String.valueOf(p.getReqGetLockSeconds()));
		props.put("captcha.req.get.minute.limit", String.valueOf(p.getReqGetMinuteLimit()));
		props.put("captcha.req.check.minute.limit", String.valueOf(p.getReqCheckMinuteLimit()));
		props.put("captcha.req.verify.minute.limit", String.valueOf(p.getReqVerifyMinuteLimit()));
		return props;
	}

	private static String nullToEmpty(String value) {
		return value == null ? "" : value;
	}

	private static void initializeBaseMap(String jigsaw, String picClick) {
		ImageUtils.cacheBootImage(getResourcesImagesFile(jigsaw + "/original/*.png"),
				getResourcesImagesFile(jigsaw + "/slidingBlock/*.png"), getResourcesImagesFile(picClick + "/*.png"));
	}

	/** 把 classpath 下的底图读成「文件名 → Base64」的映射。 */
	public static Map<String, String> getResourcesImagesFile(String path) {
		Map<String, String> imgMap = new HashMap<>();
		try {
			Resource[] resources = new PathMatchingResourcePatternResolver().getResources(path);
			for (Resource resource : resources) {
				try (InputStream in = resource.getInputStream()) {
					imgMap.put(resource.getFilename(), Base64.getEncoder().encodeToString(StreamUtils.copyToByteArray(in)));
				}
			}
		}
		catch (Exception e) {
			log.warn("加载验证码底图失败 path={}", path, e);
		}
		return imgMap;
	}

}
