package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Map;




@Data
public class UpdateCheckView {

	private String currentVersion;

	private String latestVersion;

	private boolean hasUpdate;


	private boolean enabled;

	private Long checkedAt;

	private String notes;

	private String downloadUrl;

	private String publishedAt;


	private String error;


	private String channel;





	private Map<String, Asset> assets;


	@Data
	public static class Asset {

		private String file;

		private String url;

		private Long size;

		private String sha256;

	}

}
