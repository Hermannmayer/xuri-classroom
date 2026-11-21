package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.FieldPermissionType;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicStatisticsView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ClassResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import jakarta.validation.ValidationException;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;









@Component
@RequiredArgsConstructor
public class ProjectAnswerValidator {


	private final AnswerService answerService;

	private final AnswerLookup answerLookup;

	private final AnswerLimitGuard answerLimitGuard;

	private final ProjectStatisticsService projectStatisticsService;


	private final ClassResourceService classResourceService;


	private final MessageSource messageSource;

	/** 根据问卷设置校验问卷 */
	public void validateProject(ProjectView project) {
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}


		classResourceService.assertStudentCanAnswer(project);

		ProjectSetting setting = project.getSetting();
		String projectId = project.getId();
		if (setting.getStatus() == 0) {
			throw new ErrorCodeException(ErrorCode.SurveySuspend);
		}

		Long maxAnswers = setting.getAnswerSetting().getMaxAnswers();

		if (maxAnswers != null) {
			AnswerQuery answerQuery = new AnswerQuery();
			answerQuery.setProjectId(project.getId());
			long totalAnswers = answerService.count(answerQuery);
			if (totalAnswers >= maxAnswers) {
				throw new ErrorCodeException(ErrorCode.ExceededMaxAnswers);
			}
		}

		Long endTime = setting.getAnswerSetting().getEndTime();
		if (endTime != null) {
			if (new Date().getTime() > endTime) {
				throw new ErrorCodeException(ErrorCode.ExceededEndTime);
			}
		}

		if (setting.getAnswerSetting().getLoginLimit() != null
				&& Boolean.TRUE.equals(setting.getAnswerSetting().getLoginRequired())) {
			answerLimitGuard.validateLoginLimit(projectId, setting);
		}

		if (setting.getAnswerSetting().getCookieLimit() != null) {
			answerLimitGuard.validateCookieLimit(projectId, setting);
		}

		if (setting.getAnswerSetting().getIpLimit() != null) {
			answerLimitGuard.validateIpLimit(projectId, setting);
		}

		if (setting.getAnswerSetting().getWhitelistLimit() != null) {
			answerLimitGuard.validateWhitelistLimit(projectId, setting);
		}
		validateExamSetting(project);
	}

	/** 答案校验 */
	public void validateAnswer(ProjectView project, AnswerRequest request) {
		List<SurveySchema> uniqueSchemaList = SchemaHelper.findSchemaListByAttribute(project.getSurvey(), "unique",
				true);
		SchemaHelper.TreeNode treeNode = SchemaHelper.SurveySchema2TreeNode(project.getSurvey());
		uniqueSchemaList.forEach(optionSchema -> {

			String questionId = treeNode.getTreeNodeMap().get(optionSchema.getId()).getParent().getData().getId();
			Object questionValue = request.getAnswer().get(questionId);
			if (questionValue == null) {
				return;
			}
			String uniqueQuery = String.format("\"%s\":", optionSchema.getId());
			if (SurveySchema.DataType.number == optionSchema.getAttribute().getDataType()) {
				uniqueQuery += ((Map) questionValue).get(optionSchema.getId());
			}
			else {
				uniqueQuery += "\"" + ((Map) questionValue).get(optionSchema.getId()) + "\"";
			}
			AnswerQuery query = new AnswerQuery();
			query.setProjectId(project.getId());
			query.setValueQuery(uniqueQuery);
			if (answerService.count(query) > 0) {
				String uniqueText = optionSchema.getAttribute().getUniqueText();
				throw new ValidationException(isNotBlank(uniqueText) ? uniqueText : i18n("survey.answer.duplicate"));
			}
		});


		List<SurveySchema> hasQuotaSchemaList = SchemaHelper.findSchemaHasAttribute(project.getSurvey(), "quota");
		if (hasQuotaSchemaList.size() > 0) {
			ProjectQuery query = new ProjectQuery();
			query.setId(request.getProjectId());
			PublicStatisticsView statisticsView = projectStatisticsService.statProject(query);

			hasQuotaSchemaList.forEach(optionSchema -> {
				String questionId = treeNode.getTreeNodeMap().get(optionSchema.getId()).getParent().getData().getId();
				Object questionValue = request.getAnswer().get(questionId);
				if (questionValue == null) {
					return;
				}
				boolean optionNotChecked = ((Map) questionValue).get(optionSchema.getId()) == null;
				if (optionNotChecked) {
					return;
				}
				PublicStatisticsView.QuestionStatistics questionStatistics = statisticsView.getQuestionStatistics()
						.get(questionId);
				int optionSelectedCount = questionStatistics.getOptionStatistics().stream()
						.filter(x -> x.getOptionId().equals(optionSchema.getId())).findFirst()
						.orElse(new PublicStatisticsView.OptionStatistics()).getCount();
				Integer quota = optionSchema.getAttribute().getQuota();
				if (quota != null && optionSelectedCount + 1 > quota) {
					throw new ValidationException(i18n("survey.option.limitExceeded"));
				}
			});
		}

	}

	private void validateExamSetting(ProjectView project) {
		ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
		if (examSetting == null || !ProjectModeEnum.exam.equals(project.getMode())) {
			return;
		}

		if (examSetting.getStartTime() != null && new Date(examSetting.getStartTime()).compareTo(new Date()) > 0) {
			throw new ErrorCodeException(ErrorCode.ExamUnStarted);
		}

		if (examSetting.getEndTime() != null && new Date(examSetting.getEndTime()).compareTo(new Date()) < 0) {
			throw new ErrorCodeException(ErrorCode.ExamFinished);
		}
	}

	/** 公开查询修改答案，因为涉及到权限操作，需要将之前的答案和更新的答案做一个 merge 操作 */
	public void validateAndMergeAnswer(ProjectView project, AnswerRequest answer) {
		if (isBlank(answer.getQueryId()) || isBlank(answer.getId())) {
			throw new ErrorCodeException(ErrorCode.QueryResultUpdateError);
		}
		try {

			ProjectSetting.PublicQuery query = project.getSetting().getSubmittedSetting().getPublicQuery().stream()
					.filter(x -> x.getId().equals(answer.getQueryId())).findFirst().orElseGet(() -> {
						ProjectSetting.PublicQuery publicQuery = new ProjectSetting.PublicQuery();
						publicQuery.setFieldPermission(new LinkedHashMap<>());
						return publicQuery;
					});
			if (!query.getFieldPermission().values().contains(FieldPermissionType.editable)) {
				throw new ErrorCodeException(ErrorCode.QueryResultUpdateError);
			}
			AnswerView latestAnswer = answerLookup.getAnswerForProject(project.getId(), answer.getId());
			LinkedHashMap<String, Object> existAnswer = latestAnswer.getAnswer();
			existAnswer.forEach((key, value) -> {
				if (!answer.getAnswer().containsKey(key)) {
					answer.getAnswer().put(key, value);
				}
			});
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.QueryResultUpdateError);
		}
	}

	/** 提交阶段的「能不能作答」闸门 */
	public void validateAnswerGate(ProjectView project, boolean newAnswer) {

		classResourceService.assertStudentCanAnswer(project);
		if (project == null || project.getSetting() == null || project.getSetting().getAnswerSetting() == null) {
			return;
		}
		ProjectSetting.AnswerSetting answerSetting = project.getSetting().getAnswerSetting();

		if (Boolean.TRUE.equals(answerSetting.getLoginRequired()) && !SecurityContextUtils.isAuthenticated()) {
			throw new AccessDeniedException("该问卷需要登录后才能作答");
		}

		if (answerSetting.getPassword() != null
				&& !answerLimitGuard.isPasswordPassed(project.getId(), answerSetting.getPassword())) {
			throw new AccessDeniedException("该问卷需要密码，请先在答题页输入正确密码");
		}

		if (answerSetting.getWhitelistType() != null) {
			answerLimitGuard.validateWhitelistLimit(project.getId(), project.getSetting());
		}

		ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
		Long startTime = examSetting == null ? null : examSetting.getStartTime();
		if (startTime != null && System.currentTimeMillis() < startTime) {
			throw new ErrorCodeException(ErrorCode.SurveySuspend);
		}


		if (Boolean.TRUE.equals(newAnswer)) {
			if (answerSetting.getCookieLimit() != null) {
				answerLimitGuard.validateCookieLimit(project.getId(), project.getSetting());
			}
			if (answerSetting.getIpLimit() != null) {
				answerLimitGuard.validateIpLimit(project.getId(), project.getSetting());
			}
		}
	}

	private String i18n(String key, Object... args) {
		return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
	}

}
