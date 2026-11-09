package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.ProjectSetting;

import java.util.Objects;

/**
 * 答卷计时：本轮作答开始时间、时间戳落库、考试模式的客户端快照剔除。
 *
 * <p>
 * 从 {@code AnswerServiceImpl} 切出的纯计算块（139 行、无任何 Service 依赖），
 * 搬走后 {@code beforeSaveAnswer} 的职责只剩「取项目、校验、算分、绑附件」。
 */
public final class AnswerTimer {

	/** 客户端时钟允许的偏差上限 */
	private static final long CLOCK_SKEW_MS = 60 * 1000L;

	/** 单轮作答允许跨越的最大时长（超过视为异常，回退到服务端时间） */
	private static final long MAX_ATTEMPT_SPAN_MS = 24 * 60 * 60 * 1000L;

	private AnswerTimer() {
	}

	/**
	 * 考试模式下丢掉请求体里的 survey。
	 *
	 * <p>
	 * 这一列会被 {@link #computeExamScore} 当作判分依据，而请求体是客户端可控的：伪造
	 * {@code examCorrectAnswer} 后第一次提交把它存进库里，之后每次改答案都按伪造 schema 计分 → 满分。
	 * 现在改成：
	 * <ul>
	 * <li>新建答卷：survey 留空，判分回退到项目 schema（服务端真值）；</li>
	 * <li>更新答卷：留空，不覆盖库里已有的快照（随机卷快照是 loadProject 时由服务端写入的）。</li>
	 * </ul>
	 * 非考试模式（普通问卷、题库练习）里 survey 只用于展示与练习记录，不参与计分，保留客户端内容。
	 */
	public static void dropClientSnapshotForExam(Answer answer, ProjectView project) {
		if (answer == null || project == null) {
			return;
		}
		if (!ProjectModeEnum.exam.equals(project.getMode())) {
			return;
		}
		// 题库练习的答卷快照要用来算「做了几题」，不能丢（且练习不判分）
		if (ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(project.getId())) {
			return;
		}
		answer.setSurvey(null);
	}


	/**
	 * 解析「本轮作答开始时间」。优先级：
	 * <ol>
	 * <li>库里已有答卷 → 服务端记录的 startTime，其次 create_at（都是服务端写的，可信）；</li>
	 * <li>首次提交 → 客户端上报的 {@code metaInfo.answerInfo.startTime}，但要过合理性校验；</li>
	 * <li>都没有 → 以「现在」为本轮起点，并标记为估算值。</li>
	 * </ol>
	 */
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
		// 既没有库里的答卷、客户端也没给开始时间：服务端无法证明考生是什么时候开始的。
		// 用「现在」当起点——最长交卷不会因此误判，最短交卷在这种情况只能记录不能拦截（见 assertWithinTimeLimit）。
		return new AttemptStart(now, "estimated", true);
	}


	public static Long answerStartOf(Answer answer) {
		if (answer == null || answer.getMetaInfo() == null || answer.getMetaInfo().getAnswerInfo() == null) {
			return null;
		}
		long startedAt = answer.getMetaInfo().getAnswerInfo().getStartTime();
		return startedAt > 0 ? startedAt : null;
	}


	/**
	 * 客户端上报的开始时间（防篡改）：
	 * <ul>
	 * <li>不能晚于服务器时间（允许 1 分钟时钟偏差）；</li>
	 * <li>不能早于 24 小时；</li>
	 * <li>项目设置了考试开始时间时，不能早于开考时间。</li>
	 * </ul>
	 * 注意：客户端仍可以「谎称更早开始」来让最短交卷提前满足，这是没有服务端计时器时的固有上限；
	 * 谎称越早，最长交卷越容易被自己触发，属于自伤方向。
	 */
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


	/**
	 * 把本轮起止时间写进 metaInfo.answer_info。
	 *
	 * <p>
	 * 一是给后续提交留一个服务端可信的起点（不再依赖 create_at），二是让导出里的「填写时长」有数据。
	 * 合并时保留库里已有的 clientInfo / passMode 信息，避免整列覆盖把别人的数据冲掉。
	 */
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


	/** 本轮作答的开始时间：at=服务端认定的起点，estimated=是否为「拿不到开始时间」时的估算值 */
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
