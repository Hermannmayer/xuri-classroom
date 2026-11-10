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

import javax.validation.ValidationException;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 问卷级校验：能不能答（状态/截止时间/回收上限/限次/考试时间窗）、答案是否合法（唯一性/配额）、
 * 公开查询修改答案的合并，以及提交路径上的二次闸门。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 拆出的第四块。原来的 {@code validateProject(ProjectView)} 是
 * {@code SurveyService} 的接口方法（{@code FileServiceImpl} 也在调），这里保持 public 并逐行搬入。
 */
@Component
@RequiredArgsConstructor
public class ProjectAnswerValidator {

	/** 这里要读答卷计数与配额统计，注入的是接口而不是实现类 */
	private final AnswerService answerService;

	private final AnswerLookup answerLookup;

	private final AnswerLimitGuard answerLimitGuard;

	private final ProjectStatisticsService projectStatisticsService;

	/** 按班级分配：学生只能参加分配给自己班的考试 */
	private final ClassResourceService classResourceService;

	/** 只有 validateAnswer 的提示文案用到 i18n */
	private final MessageSource messageSource;

	/**
	 * 根据问卷设置校验问卷
	 * @param project
	 * @return
	 */
	public void validateProject(ProjectView project) {
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		// 按班级分配：没分配到学生所在班 → 当作不存在（不泄露标题）；未开始/已结束/关闭分别报对应错误。
		// 教职工、管理员、匿名公开问卷在这里直接放行。
		classResourceService.assertStudentCanAnswer(project);

		ProjectSetting setting = project.getSetting();
		String projectId = project.getId();
		if (setting.getStatus() == 0) {
			throw new ErrorCodeException(ErrorCode.SurveySuspend);
		}

		Long maxAnswers = setting.getAnswerSetting().getMaxAnswers();
		// 校验最大答案条数限制
		if (maxAnswers != null) {
			AnswerQuery answerQuery = new AnswerQuery();
			answerQuery.setProjectId(project.getId());
			long totalAnswers = answerService.count(answerQuery);
			if (totalAnswers >= maxAnswers) {
				throw new ErrorCodeException(ErrorCode.ExceededMaxAnswers);
			}
		}
		// 校验问卷是否已到结束时间
		Long endTime = setting.getAnswerSetting().getEndTime();
		if (endTime != null) {
			if (new Date().getTime() > endTime) {
				throw new ErrorCodeException(ErrorCode.ExceededEndTime);
			}
		}
		// 如果需要登录，则使用账号进行限制
		if (setting.getAnswerSetting().getLoginLimit() != null
				&& Boolean.TRUE.equals(setting.getAnswerSetting().getLoginRequired())) {
			answerLimitGuard.validateLoginLimit(projectId, setting);
		}
		// cookie 限制
		if (setting.getAnswerSetting().getCookieLimit() != null) {
			answerLimitGuard.validateCookieLimit(projectId, setting);
		}
		// ip 限制
		if (setting.getAnswerSetting().getIpLimit() != null) {
			answerLimitGuard.validateIpLimit(projectId, setting);
		}
		// 白名单限制
		if (setting.getAnswerSetting().getWhitelistLimit() != null) {
			answerLimitGuard.validateWhitelistLimit(projectId, setting);
		}
		validateExamSetting(project);
	}

	/**
	 * 答案校验
	 * @param project
	 * @param request
	 */
	public void validateAnswer(ProjectView project, AnswerRequest request) {
		List<SurveySchema> uniqueSchemaList = SchemaHelper.findSchemaListByAttribute(project.getSurvey(), "unique",
				true);
		SchemaHelper.TreeNode treeNode = SchemaHelper.SurveySchema2TreeNode(project.getSurvey());
		uniqueSchemaList.forEach(optionSchema -> {
			// 支持数值和字符串
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

		// 选项配额校验
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
		// 校验考试开始时间
		if (examSetting.getStartTime() != null && new Date(examSetting.getStartTime()).compareTo(new Date()) > 0) {
			throw new ErrorCodeException(ErrorCode.ExamUnStarted);
		}
		// 校验考试结束时间
		if (examSetting.getEndTime() != null && new Date(examSetting.getEndTime()).compareTo(new Date()) < 0) {
			throw new ErrorCodeException(ErrorCode.ExamFinished);
		}
	}

	/**
	 * 公开查询修改答案，因为涉及到权限操作，需要将之前的答案和更新的答案做一个 merge 操作
	 * @param project
	 * @param answer
	 */
	public void validateAndMergeAnswer(ProjectView project, AnswerRequest answer) {
		if (isBlank(answer.getQueryId()) || isBlank(answer.getId())) {
			throw new ErrorCodeException(ErrorCode.QueryResultUpdateError);
		}
		try {
			// 公开查询设置必须存在，并且包含可编辑字段
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

	/**
	 * 提交阶段的「能不能作答」闸门。
	 *
	 * <p>此前密码 / 需要登录 / 白名单只在「打开问卷」时校验，直接 POST saveAnswer 就能绕过。
	 * 这里把同一套条件在提交路径上再判一次；回收上限不在此列（会挡住正常修改答案）。
	 */
	public void validateAnswerGate(ProjectView project, boolean newAnswer) {
		// 提交路径也要判一次班级分配：否则拿到 projectId 直接 POST saveAnswer 就能绕开班级窗口
		classResourceService.assertStudentCanAnswer(project);
		if (project == null || project.getSetting() == null || project.getSetting().getAnswerSetting() == null) {
			return;
		}
		ProjectSetting.AnswerSetting answerSetting = project.getSetting().getAnswerSetting();
		// 需要登录
		if (Boolean.TRUE.equals(answerSetting.getLoginRequired()) && !SecurityContextUtils.isAuthenticated()) {
			throw new AccessDeniedException("该问卷需要登录后才能作答");
		}
		// 需要密码：必须已通过密码校验（见 markPasswordPassed）
		if (answerSetting.getPassword() != null
				&& !answerLimitGuard.isPasswordPassed(project.getId(), answerSetting.getPassword())) {
			throw new AccessDeniedException("该问卷需要密码，请先在答题页输入正确密码");
		}
		// 白名单
		if (answerSetting.getWhitelistType() != null) {
			answerLimitGuard.validateWhitelistLimit(project.getId(), project.getSetting());
		}
		// 开始时间（配置在考试设置里）
		ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
		Long startTime = examSetting == null ? null : examSetting.getStartTime();
		if (startTime != null && System.currentTimeMillis() < startTime) {
			throw new ErrorCodeException(ErrorCode.SurveySuspend);
		}
		// 每 IP / 每台设备限次：此前只在「打开问卷」时校验，直接 POST saveAnswer 可绕过；
		// 只在新建答卷时校验，否则调用方自己的那份答卷会把额度算进去、导致改答案被拦。
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
