package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.AnswerFreqEnum;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.List;





@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectSetting {




	@Builder.Default
	private Integer status = 0;

	private ProjectModeEnum mode;

	@Builder.Default
	AnswerSetting answerSetting = new AnswerSetting();

	@Builder.Default
	SubmittedSetting submittedSetting = new SubmittedSetting();

	@Builder.Default
	ExamSetting examSetting = new ExamSetting();

	@Data
	public static class AnswerSetting {




		private String password;




		private Boolean progressBar;







		private Boolean answererNameRequired;




		private Boolean loginRequired;




		private Boolean questionNumber = true;




		private Boolean autoSave;

		private LinkedHashMap initialValues;




		private Long maxAnswers;




		private Long endTime;




		private Boolean wechatOnly;




		private Boolean wechatUserInfo;




		private UniqueLimitSetting ipLimit;




		private UniqueLimitSetting cookieLimit;




		private UniqueLimitSetting loginLimit;




		private Boolean onePageOneQuestion;

		private Boolean autoNextAfterAnswer;

		private Boolean answerSheetVisible;






		private Integer whitelistType;




		private UniqueLimitSetting whitelistLimit;




		private TriggerType triggerType = TriggerType.onBlur;




		private Boolean copyEnabled = true;




		private String defaultLocale;

	}

	public enum TriggerType {




		onInput,



		onBlur,



		onSubmit

	}

	@Data
	public static class SubmittedSetting {




		private String contentHtml;




		private Boolean enableUpdate;




		private String redirectUrl;




		private List<PublicQuery> publicQuery;




		private Boolean answerAnalysis;




		private Boolean transcriptVisible;




		private Boolean rankVisible;

	}

	@Data
	public static class UniqueLimitSetting {




		private Integer limitNum;




		private AnswerFreqEnum limitFreq;

		public UniqueLimitSetting() {
		}

		public UniqueLimitSetting(Integer limitNum, AnswerFreqEnum limitFreq) {
			this.limitNum = limitNum;
			this.limitFreq = limitFreq;
		}

	}




	@Data
	public static class LinkWithInitialValuesSetting {




		private String id;

		private LinkedHashMap initialValues;

	}

	@Data
	public static class ExamSetting {




		private Boolean scoringEnabled;




		private Long startTime;




		private Long endTime;




		private Integer minSubmitMinutes;




		private Integer maxSubmitMinutes;




		private Boolean rankingEnabled;




		private Boolean exerciseMode;




		private Boolean passMode;




		private Integer passModePerSeconds;




		private Boolean randomOrder;




		private List<RandomSurveyCondition> randomSurvey;




		private Boolean randomSurveyWrong;




		private Integer maxSwitchScreenTimes;




		private Boolean favoriteEnabled = true;

	}




	@Data
	public static class PublicQuery {




		private String id;




		private String title;




		private Boolean enabled;




		private String description;




		private String password;




		private String conditionQuestion;




		private LinkedHashMap<String, Integer> fieldPermission;




		private Boolean enableUpdate;




		private List<String> linkValidityPeriod;

	}




	@Data
	public static class RandomSurveyCondition implements Serializable {

		private String id;




		private String repoId;




		private Integer questionsNum;




		private Double examScore;




		private List<String> tags;




		private List<String> types;

	}

}
