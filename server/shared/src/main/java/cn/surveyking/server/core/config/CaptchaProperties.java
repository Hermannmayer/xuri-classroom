package cn.surveyking.server.core.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;











@Data
@ConfigurationProperties(prefix = "aj.captcha")
public class CaptchaProperties {


	private String type = "blockPuzzle";


	private String jigsaw = "";


	private String picClick = "";


	private String waterMark = "";

	private String waterFont = "WenQuanZhengHei.ttf";

	private String fontType = "WenQuanZhengHei.ttf";


	private String slipOffset = "5";


	private Boolean aesStatus = Boolean.TRUE;


	private String interferenceOptions = "0";


	private String cacheNumber = "1000";


	private String timingClear = "180";


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
