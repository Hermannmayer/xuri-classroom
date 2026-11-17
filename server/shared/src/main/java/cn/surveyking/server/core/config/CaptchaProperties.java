package cn.surveyking.server.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 滑块/点选验证码配置。
 *
 * <p>
 * 这些配置项原先由 {@code com.anji-plus:spring-boot-starter-captcha} 的
 * {@code AjCaptchaProperties} 承载（前缀 {@code aj.captcha}）。该 starter 的 HTTP 层是
 * {@code javax.servlet} 写的，迁到 Jakarta（Spring Boot 4）后不能再用，只保留零 servlet 依赖的
 * {@code com.anji-plus:captcha} 核心包；配置绑定随之由这个类接管，字段名与默认值
 * 与 aj-captcha 1.3.0 保持一致，{@code application.yml} 里的 {@code aj.captcha.*} 不需要改动。
 */
@Data
@ConfigurationProperties(prefix = "aj.captcha")
public class CaptchaProperties {

	/** 验证码类型：blockPuzzle（滑块拼图）/ clickWord（文字点选）/ default（两者皆可）。 */
	private String type = "blockPuzzle";

	/** 滑块底图目录，支持 classpath: 前缀。 */
	private String jigsaw = "";

	/** 点选底图目录，支持 classpath: 前缀。 */
	private String picClick = "";

	/** 底图水印文字，空串表示不加水印。 */
	private String waterMark = "";

	private String waterFont = "WenQuanZhengHei.ttf";

	private String fontType = "WenQuanZhengHei.ttf";

	/** 拼图块与缺口的纵向偏移（像素）。 */
	private String slipOffset = "5";

	/** 是否对坐标做 AES 加密（前端依赖它换 secretKey，默认开启）。 */
	private Boolean aesStatus = Boolean.TRUE;

	/** 干扰项数量：0 / 1 / 2。 */
	private String interferenceOptions = "0";

	/** 本地缓存条目阈值。 */
	private String cacheNumber = "1000";

	/** 本地缓存定时清理间隔（秒）。 */
	private String timingClear = "180";

	/** 缓存类型：local / redis。 */
	private String cacheType = "local";

	private boolean historyDataClearEnable = false;

	private boolean reqFrequencyLimitEnable = false;

	private int reqGetLockLimit = 5;

	private int reqGetLockSeconds = 300;

	private int reqGetMinuteLimit = 100;

	private int reqCheckMinuteLimit = 100;

	private int reqVerifyMinuteLimit = 100;

	private int fontStyle = 1;

	private int fontSize = 25;

	private int clickWordCount = 4;

}
