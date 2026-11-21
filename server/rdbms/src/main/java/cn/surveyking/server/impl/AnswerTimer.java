package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.ProjectSetting;

import java.util.Objects;








public final class AnswerTimer {


	private static final long CLOCK_SKEW_MS = 60 * 1000L;


	private static final long MAX_ATTEMPT_SPAN_MS = 24 * 60 * 60 * 1000L;

	private AnswerTimer() {
	}

	/** 考试模式下丢掉请求体里的 survey */
	public static void dropClientSnapshotForExam(Answer answer, ProjectView project) {
		if (answer == null || project == null) {
			return;
		}
		if (!ProjectModeEnum.exam.equals(project.getMode())) {
			return;
		}

		if (ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(project.getId())) {
			return;
		}
		answer.setSurvey(null);
	}


	/** 解析「本轮作答开始时间」 */
	public static AttemptStart resolveAttemptStart(Answer answer, ProjectView project, Answer previousAnswer) {
		long now = System.currentTimeMillis();
		if (previousAnswer != null) {
			Long storedStart = answerStartOf(previousAnswer);
			if (storedStart != null) {
				return new AttemptStart(storedStart, "stored", false);
			}
			if (previousAnswer.getCreateAt() != null) {
				return new AttemptStart(previousAnswer.getCreateAt().getTime(), "answer.createAt", false);
			}
		}
		Long clientStart = clientStartedAt(answer, project, now);
		if (clientStart != null) {
			return new AttemptStart(clientStart, "client", false);
		}


		return new AttemptStart(now, "estimated", true);
	}


	public static Long answerStartOf(Answer answer) {
		if (answer == null || answer.getMetaInfo() == null || answer.getMetaInfo().getAnswerInfo() == null) {
			return null;
		}
		long startedAt = answer.getMetaInfo().getAnswerInfo().getStartTime();
		return startedAt > 0 ? startedAt : null;
	}


	/** 客户端上报的开始时间（防篡改）：  不能晚于服务器时间（允许 1 分钟时钟偏差）； 不能早于 24 小时； 项目设置了考试开始时间时，不能早于开考时间 */
	public static Long clientStartedAt(Answer answer, ProjectView project, long now) {
		if (answer == null || answer.getMetaInfo() == null || answer.getMetaInfo().getAnswerInfo() == null) {
			return null;
		}
		long startedAt = answer.getMetaInfo().getAnswerInfo().getStartTime();
		if (startedAt <= 0 || startedAt > now + CLOCK_SKEW_MS) {
			return null;
		}
		if (startedAt < now - MAX_ATTEMPT_SPAN_MS) {
			return null;
		}
		ProjectSetting setting = project == null ? null : project.getSetting();
		Long examStart = setting == null || setting.getExamSetting() == null ? null
				: setting.getExamSetting().getStartTime();
		if (examStart != null && startedAt < examStart - CLOCK_SKEW_MS) {
			return null;
		}
		return startedAt;
	}


	/** 把本轮起止时间写进 metaInfo.answer_info */
	public static void stampAttemptTime(Answer answer, Answer previousAnswer, AttemptStart attemptStart) {
		if (answer == null || attemptStart == null) {
			return;
		}
		AnswerMetaInfo meta = answer.getMetaInfo();
		if (meta == null && previousAnswer != null) {
			meta = previousAnswer.getMetaInfo();
		}
		if (meta == null) {
			meta = new AnswerMetaInfo();
		}
		if (meta.getClientInfo() == null && previousAnswer != null && previousAnswer.getMetaInfo() != null) {
			meta.setClientInfo(previousAnswer.getMetaInfo().getClientInfo());
		}
		AnswerMetaInfo.AnswerInfo answerInfo = meta.getAnswerInfo() == null ? new AnswerMetaInfo.AnswerInfo()
				: meta.getAnswerInfo();
		answerInfo.setStartTime(attemptStart.at);
		answerInfo.setEndTime(System.currentTimeMillis());
		meta.setAnswerInfo(answerInfo);
		answer.setMetaInfo(meta);
	}



	public static final class AttemptStart {

		public final long at;

		public final String source;

		public final boolean estimated;

		public AttemptStart(long at, String source, boolean estimated) {
			this.at = at;
			this.source = source;
			this.estimated = estimated;
		}

	}

}
