package cn.surveyking.server.domain.dto;

import lombok.Data;

@Data
public class UpdateDownloadStatus {

	private String phase = "idle";

	private String version;

	private long downloadedBytes;

	private Long totalBytes;

	private int percent;

	private long bytesPerSecond;

	private int attempt;

	private int maxAttempts = 3;

	private String source;

	private boolean verified;

	private String error;

	private String file;

	private Long startedAt;

	private Long finishedAt;
}
