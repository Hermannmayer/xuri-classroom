package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * 交卷前的服务端处理：计时裁决、附件绑定、考试判分、联动题更新。
 *
 * <p>
 * 从 {@code AnswerServiceImpl#beforeSaveAnswer} 切出。库里已有的答卷（previousAnswer）
 * 由调用方先查好传进来，避免组件反过来依赖 {@code AnswerService} 造成构造器循环。
 */
@Component
@RequiredArgsConstructor
public class AnswerScoringService {

	/** 交卷宽限：到点后留 60 秒给网络延迟与自动交卷，避免边界误杀 */
	private static final long SUBMIT_GRACE_MS = 60 * 1000L;

	private final ProjectService projectService;

	private final FileService fileService;

	private final LinkSurveyUpdater linkSurveyUpdater;

	/**
	 * 答案保存之前计算考试分值、每题得分情况
	 * @param answer
	 * @param previousAnswer 库里已存的答卷（可能带随机卷快照），可空
	 * @return
	 */
	public Answer beforeSaveAnswer(Answer answer, Answer previousAnswer) {
		ProjectView project = projectService.getProject(answer.getProjectId());
		// 考试模式下客户端递交的 schema 一律不落库（可伪造 examCorrectAnswer 刷分）
		AnswerTimer.dropClientSnapshotForExam(answer, project);
		AnswerTimer.AttemptStart attemptStart = AnswerTimer.resolveAttemptStart(answer, project, previousAnswer);
		assertWithinTimeLimit(answer, project, attemptStart);
		AnswerTimer.stampAttemptTime(answer, previousAnswer, attemptStart);
		SurveySchema answerSurvey = answer.getSurvey() != null ? answer.getSurvey()
				: previousAnswer != null && previousAnswer.getSurvey() != null ? previousAnswer.getSurvey()
						: project.getSurvey();
		fileService.validateAndBindAnswerFiles(answer.getProjectId(), answer.getId(), answerSurvey, answer.getAnswer(),
				previousAnswer == null ? null : previousAnswer.getAnswer());
		computeExamScore(answer, project, previousAnswer);
		linkSurveyUpdater.updateLinkSurveyAnswer(answer, project);
		return answer;
	}

	/**
	 * 服务端裁决最长/最短答题时间。
	 *
	 * <p>
	 * 起点不再只认「库里的答卷」：首次提交也会拿到一个起点（客户端上报或估算），所以首次提交同样参与判定。 例外是
	 * {@code estimated}（既没库里的答卷、客户端也没给开始时间）：这时硬判最短交卷会把每一次 首次提交都拒掉（耗时恒为 0），因此这种情况只记录不拦截。
	 */
	private static void assertWithinTimeLimit(Answer answer, ProjectView project,
			AnswerTimer.AttemptStart attemptStart) {
		if (project == null || project.getSetting() == null || project.getSetting().getExamSetting() == null) {
			return;
		}
		if (attemptStart == null) {
			return;
		}
		Integer maxMinutes = project.getSetting().getExamSetting().getMaxSubmitMinutes();
		Integer minMinutes = project.getSetting().getExamSetting().getMinSubmitMinutes();
		long now = System.currentTimeMillis();
		if (maxMinutes != null && maxMinutes > 0 && now > attemptStart.at + maxMinutes * 60_000L + SUBMIT_GRACE_MS) {
			throw new AccessDeniedException("本次考试已超过最长答题时间（" + maxMinutes + " 分钟），无法再提交");
		}
		// 最短交卷：只对「正式提交」生效，暂存草稿不受限；时间到点自动交卷也不该被挡，所以只判 tempSave=1
		boolean finalSubmit = Integer.valueOf(1).equals(answer.getTempSave());
		if (finalSubmit && minMinutes != null && minMinutes > 0 && !attemptStart.estimated) {
			long earliest = attemptStart.at + minMinutes * 60_000L;
			if (now < earliest) {
				long leftSec = Math.max(0, (earliest - now) / 1000);
				throw new AccessDeniedException(
						"需答满 " + minMinutes + " 分钟才能交卷，还剩 " + (leftSec / 60) + " 分 " + (leftSec % 60) + " 秒");
			}
		}
	}

	/**
	 * 计算考试分值。
	 *
	 * <p>
	 * 判分用的 schema **只能来自服务端**：库里已存的快照（随机卷由 loadProject 时的服务端逻辑写入） → 项目
	 * schema。绝不使用请求体/请求映射出来的 {@code answer.getSurvey()}，否则客户端伪造 {@code examCorrectAnswer}
	 * 就能刷满分。
	 *
	 * <p>
	 * 历史答卷快照缺失时仍然回退到项目 schema（保持原有兼容行为）。
	 */
	private void computeExamScore(Answer answer, ProjectView project, Answer previousAnswer) {
		if (project != null && ProjectModeEnum.exam.equals(project.getMode()) && answer != null
				&& answer.getAnswer() != null && !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(project.getId())) {
			SurveySchema srcSchema = trustedScoreSchema(project, previousAnswer);
			if (srcSchema == null) {
				return;
			}
			AnswerScoreEvaluator evaluator = new AnswerScoreEvaluator(srcSchema, answer.getAnswer());
			answer.setExamScore(evaluator.eval());
			AnswerExamInfo examInfo = new AnswerExamInfo();
			examInfo.setQuestionScore(evaluator.getQuestionScore());
			answer.setExamInfo(examInfo);
		}
	}

	/**
	 * 判分 schema 的唯一出口：服务端快照优先（随机卷），否则项目 schema。
	 * @param project 服务端项目视图
	 * @param previousAnswer 库里已存的答卷（可能带随机卷快照），可空
	 */
	private static SurveySchema trustedScoreSchema(ProjectView project, Answer previousAnswer) {
		if (previousAnswer != null && previousAnswer.getSurvey() != null) {
			return previousAnswer.getSurvey();
		}
		return project == null ? null : project.getSurvey();
	}

}
