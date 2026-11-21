package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;





@Data
public class SystemInfo {




	private String id;




	private String name;




	private String description;




	private String avatar;




	private String locale;




	private String version;

	private RegisterInfo registerInfo;

	private SystemSetting setting;

	private String publicKey;

	private Boolean aiEnabled;

	private OAuthProviderAvailability oauthProviders;

	@Data
	public static class RegisterInfo {




		private Boolean registerEnabled;




		private List<String> roles = new ArrayList<>();




		private Boolean strongPasswordEnabled;







		private String deptId;

	}

	@Data
	public static class SystemSetting {




		private Boolean captchaEnabled;




		private String copyright;




		private String recordNum;




		private String favicon;




		private String amapKey;




		private String amapSecurityJsCode;





		private Boolean copyProtected;




		private Boolean watermarkEnabled;




		private String watermarkMode;






		private String collaboratorAuthority;








		private String exportPassword;


		private Boolean exportPasswordEnabled;


		private Boolean updateCheckEnabled;


		private String updateGithubRepo;


		private String updateApiBase;


		private String updateManifestUrl;


		private Integer updateCheckIntervalHours;

		private UpdateStatus updateStatus;







		private Boolean anonymousCleanupEnabled;


		private Integer anonymousRetentionDays;


		private Date anonymousLastCleanupAt;


		private Integer anonymousLastCleanupCount;









		private Boolean anonymousPurgeEnabled;





		private Integer anonymousPurgeDelayDays;







		private Integer answerPdfConcurrency;







		private Boolean pauseAnswerPdfDuringExam;

	}

	@Data
	public static class UpdateStatus {

		private Long checkedAt;

		private String currentVersion;

		private String latestVersion;

		private Boolean hasUpdate;

		private Boolean enabled;

		private String error;

		private String channel;
	}

	@Data
	public static class AiSetting {

		private Boolean enabled;

		private String provider;

		private String displayName;

		private String baseUrl;

		private List<String> models;

		private Map<String, ModelMeta> modelMeta;

		private String defaultModel;

		private String apiKey;





		private String token;

		private String prompt;







		private Integer dailyTokenLimit;






		private Integer perUserDailyLimit;







		private Integer maxChatTurns;







		private Integer maxTurnChars;







		private Integer rateLimitPerMinute;

		@Data
		public static class ModelMeta {

			private String displayName;

			private Integer contextWindow;

			private Integer maxOutputTokens;

			private List<String> inputTypes;
		}

	}

}
