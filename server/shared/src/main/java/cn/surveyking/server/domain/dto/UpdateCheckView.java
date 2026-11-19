package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Map;

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

	/** 发布通道：stable（正式版）/ nightly（每夜尝鲜） */
	private String channel;

	/**
	 * 各平台安装包（键：windows / linux / docker / jar）。
	 * <p>来自 Release 里附带的 update.json；客户端据此下载并校验 sha256，不用猜资产名字。
	 */
	private Map<String, Asset> assets;

	/** 单个平台资产 */
	@Data
	public static class Asset {

		private String file;

		private String url;

		private Long size;

		private String sha256;

	}

}
