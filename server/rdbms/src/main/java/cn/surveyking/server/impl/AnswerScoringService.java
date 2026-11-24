package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.core.uitls.RichTextSanitizer;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.service.AnswerGradeService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;








@Component
@RequiredArgsConstructor
public class AnswerScoringService {


	private static final long SUBMIT_GRACE_MS = 60 * 1000L;

	private final ProjectService projectService;

	private final FileService fileService;

	private final LinkSurveyUpdater linkSurveyUpdater;





	private final AnswerGradeService answerGradeService;

	/** 答案保存之前计算考试分值、每题得分情况 */
	public Answer beforeSaveAnswer(Answer answer, Answer previousAnswer) {
		ProjectView project = projectService.getProject(answer.getProjectId());

		AnswerTimer.dropClientSnapshotForExam(answer, project);

		stampServerSnapshot(answer, project);
		AnswerTimer.AttemptStart attemptStart = AnswerTimer.resolveAttemptStart(answer, project, previousAnswer);
		assertWithinTimeLimit(answer, project, attemptStart);
		AnswerTimer.stampAttemptTime(answer, previousAnswer, attemptStart);
		SurveySchema answerSurvey = answer.getSurvey() != null ? answer.getSurvey()
				: previousAnswer != null && previousAnswer.getSurvey() != null ? previousAnswer.getSurvey()
						: project.getSurvey();
		fileService.validateAndBindAnswerFiles(answer.getProjectId(), answer.getId(), answerSurvey, answer.getAnswer(),
				previousAnswer == null ? null : previousAnswer.getAnswer());
		sanitizeRichTextAnswers(answerSurvey, answer.getAnswer());
		sanitizeRichTextAnswers(answerSurvey, answer.getTempAnswer());
		computeExamScore(answer, project, previousAnswer);

		answerGradeService.onSubmitted(answer, trustedScoreSchema(project, previousAnswer));
		linkSurveyUpdater.updateLinkSurveyAnswer(answer, project);
		return answer;
	}

	private void sanitizeRichTextAnswers(SurveySchema survey, java.util.Map<String, Object> answers) {
		if (survey == null || answers == null || answers.isEmpty()) {
			return;
		}
		SchemaHelper.flatSurveySchema(survey).stream()
				.filter(schema -> SurveySchema.QuestionType.RichText.equals(schema.getType()))
				.forEach(schema -> {
					Object value = answers.get(schema.getId());
					if (value instanceof String) {
						answers.put(schema.getId(), RichTextSanitizer.clean((String) value));
					}
				});
	}

	/** 服务端裁决最长/最短答题时间 */
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

	/** 计算考试分值 */
	private void computeExamScore(Answer answer, ProjectView project, Answer previousAnswer) {
		if (project != null && scoringEnabled(project) && answer != null
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

	/** 计分开关：显式配置优先；未配置时考试默认计分、问卷默认不计分 */
	private static boolean scoringEnabled(ProjectView project) {
		Boolean flag = project.getSetting() == null || project.getSetting().getExamSetting() == null ? null
				: project.getSetting().getExamSetting().getScoringEnabled();
		return flag != null ? flag : ProjectModeEnum.exam.equals(project.getMode());
	}

	/** 考试模式把「交卷这一刻的题目」由服务端自己存一份快照，改卷/重导入后回看仍能对上题目；随机抽题已有自己的快照，这里不覆盖 */
	private static void stampServerSnapshot(Answer answer, ProjectView project) {
		if (answer == null || project == null || project.getSurvey() == null) {
			return;
		}
		if (!ProjectModeEnum.exam.equals(project.getMode())
				|| ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(project.getId())) {
			return;
		}
		if (answer.getSurvey() != null) {
			return;
		}
		if (hasRandomSetting(project)) {
			return;
		}
		answer.setSurvey(project.getSurvey().deepCopy());
	}

	private static boolean hasRandomSetting(ProjectView project) {
		if (project.getSetting() == null || project.getSetting().getExamSetting() == null) {
			return false;
		}
		return project.getSetting().getExamSetting().getRandomSurvey() != null
				|| Boolean.TRUE.equals(project.getSetting().getExamSetting().getRandomOrder());
	}

	private static SurveySchema trustedScoreSchema(ProjectView project, Answer previousAnswer) {
		if (previousAnswer != null && previousAnswer.getSurvey() != null) {
			return previousAnswer.getSurvey();
		}
		return project == null ? null : project.getSurvey();
	}

}
