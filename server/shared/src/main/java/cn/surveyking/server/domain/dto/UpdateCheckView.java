package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 更新检查结果：只负责提示，不执行升级。
 */
@Data
public class UpdateCheckView {

	private String currentVersion;

	private String latestVersion;

	private boolean hasUpdate;

	/** 是否配置了更新清单地址 */
	private boolean enabled;

	private String notes;

	private String downloadUrl;

	private String publishedAt;

	/** 拉取清单失败时的可读提示 */
	private String error;

}
