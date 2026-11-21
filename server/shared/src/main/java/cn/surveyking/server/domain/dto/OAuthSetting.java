package cn.surveyking.server.domain.dto;

import lombok.Data;







@Data
public class OAuthSetting {

	private String publicBaseUrl;

	private GoogleClient google;

	private WechatClient wechatWeb;

	private WechatClient wechatOfficial;

	@Data
	public static class GoogleClient {

		private Boolean enabled;

		private String clientId;

		private String clientSecret;

		@Override
		public String toString() {
			return "GoogleClient(enabled=" + enabled + ", clientId=" + clientId + ", clientSecret=<redacted>)";
		}

	}

	@Data
	public static class WechatClient {

		private Boolean enabled;

		private String appId;

		private String appSecret;

		@Override
		public String toString() {
			return "WechatClient(enabled=" + enabled + ", appId=" + appId + ", appSecret=<redacted>)";
		}

	}

}
