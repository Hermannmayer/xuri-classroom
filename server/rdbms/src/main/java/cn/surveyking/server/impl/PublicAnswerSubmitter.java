package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicAnswerView;
import cn.surveyking.server.domain.dto.SurveyWechatIdentity;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ProjectService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;

import static org.apache.commons.lang3.StringUtils.isNotBlank;









@Component
@Transactional
@RequiredArgsConstructor
public class PublicAnswerSubmitter {

	private final ProjectService projectService;

	private final AnswerService answerService;

	private final AnswerValidationService answerValidationService;

	private final ProjectAnswerValidator projectAnswerValidator;

	private final AnswerLookup answerLookup;

	private final ExamControlService examControlService;

	private final WechatAccessGuard wechatAccessGuard;

	private final UserBookServiceImpl userBookService;

	private final ProjectPartnerMapper projectPartnerMapper;

	@Transactional(rollbackFor = Exception.class)
	public PublicAnswerView saveAnswer(AnswerRequest request) {
		String projectId = request.getProjectId();
		PublicAnswerView result = new PublicAnswerView();
		ProjectView project = projectService.getProject(projectId);

		answerValidationService.validateSubmittable(project, !isNotBlank(request.getId()));

		projectAnswerValidator.validateAnswerGate(project, !isNotBlank(request.getId()));
		SurveyWechatIdentity wechatIdentity = wechatAccessGuard.requireWechatAccess(project);
		wechatAccessGuard.applyWechatIdentity(project, request, wechatIdentity);
		String answerId = request.getId();

		String randomSurveyCookieName = AppConsts.COOKIE_RANDOM_PROJECT_PREFIX + project.getId();
		String answerIdFromCookie = ContextHelper.getCookie(randomSurveyCookieName);
		if (isNotBlank(answerIdFromCookie)) {
			answerLookup.getAnswerForProject(projectId, answerIdFromCookie);
			answerId = answerIdFromCookie;
		}
		else if (isNotBlank(request.getQueryId())) {

			projectAnswerValidator.validateAndMergeAnswer(project, request);
		}
		else if (isNotBlank(request.getId())
				&& !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(request.getProjectId())) {

			answerLookup.getAnswerForProject(projectId, request.getId());
			boolean enableUpdate = Boolean.TRUE.equals(project.getSetting().getSubmittedSetting().getEnableUpdate());

			boolean tempSaving = Integer.valueOf(0).equals(request.getTempSave());
			if (!enableUpdate && !tempSaving) {
				throw new ErrorCodeException(ErrorCode.AnswerChangeDisabled);
			}
		}
		else {


			if (Boolean.TRUE.equals(request.getFreshAttempt())) {
				projectAnswerValidator.validateProject(project);
				projectAnswerValidator.validateAnswer(project, request);
			}
			else {

				AnswerView latestAnswer = validateAndGetLatestAnswer(project, request);
				if (latestAnswer != null) {
					answerId = latestAnswer.getId();
				}
			}
		}


		request.setId(answerId);
		AnswerView answerView = answerService.saveAnswer(request);
		result.setAnswerId(answerView.getId());

		examControlService.applyPassModePenalty(project, request, answerView);

		boolean scoringEnabled = ProjectModeEnum.exam.equals(project.getMode())
				|| (project.getSetting() != null && project.getSetting().getExamSetting() != null
						&& Boolean.TRUE.equals(project.getSetting().getExamSetting().getScoringEnabled()));
		if (scoringEnabled && !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)
				&& answerView.getExamInfo() != null) {
			result.setExamScore(answerView.getExamScore());
			result.setQuestionScore(answerView.getExamInfo().getQuestionScore());

			AnswerExamInfo answerExamInfo = answerView.getExamInfo();
			LinkedHashMap<String, Double> questionScore = answerExamInfo.getQuestionScore();
			userBookService.saveWrongQuestion(questionScore, answerView.getAnswer(),
					answerView.getSurvey() != null ? answerView.getSurvey() : project.getSurvey(), project.getId(),
					null);
		}

		request.setId(answerView.getId());
		updateProjectPartnerByAnswer(request, project);

		if (isNotBlank(answerIdFromCookie)) {
			Cookie cookie = new Cookie(randomSurveyCookieName, answerIdFromCookie);
			cookie.setMaxAge(0);
			ContextHelper.getCurrentHttpResponse().addCookie(cookie);
		}


		if (Boolean.TRUE.equals(answerView.getIsAnonymous())
				&& !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)) {
			Cookie resultCookie = new Cookie(AppConsts.COOKIE_RESULT_PREFIX + projectId, answerView.getId());
			resultCookie.setPath("/");
			resultCookie.setMaxAge(7 * 24 * 3600);
			resultCookie.setHttpOnly(true);
			ContextHelper.getCurrentHttpResponse().addCookie(resultCookie);
		}
		return result;
	}

	public void tempSaveAnswer(AnswerRequest request) {
		String projectId = request.getProjectId();
		if (!Integer.valueOf(0).equals(request.getTempSave()) || request.getTempAnswer() == null || projectId == null) {
			return;
		}
		String answerId = ContextHelper.getCookie(AppConsts.COOKIE_RANDOM_PROJECT_PREFIX + projectId);
		if (answerId == null) {
			return;
		}
		if (!SecurityContextUtils.isAuthenticated()) {

			return;
		}
		answerLookup.getAnswerForProject(projectId, answerId);
		AnswerRequest answerRequest = new AnswerRequest();
		answerRequest.setId(answerId);
		answerRequest.setTempSave(0);

		answerRequest.setProjectId(projectId);
		answerRequest.setTempAnswer(request.getTempAnswer());
		answerService.updateAnswer(answerRequest);
	}

	/** 校验问卷并且判断是否要更新最近一次的答案；返回 最近一次的答案 */
	private AnswerView validateAndGetLatestAnswer(ProjectView project, AnswerRequest request) {
		ProjectSetting setting = project.getSetting();
		boolean needGetLatest = false;
		try {
			projectAnswerValidator.validateProject(project);
			projectAnswerValidator.validateAnswer(project, request);

			if (SecurityContextUtils.isAuthenticated() && setting != null
					&& Boolean.TRUE.equals(setting.getSubmittedSetting().getEnableUpdate())) {
				needGetLatest = true;
			}
		}
		catch (ErrorCodeException e) {


			if (ErrorCode.SurveySubmitted.equals(e.getErrorCode()) && SecurityContextUtils.isAuthenticated()
					&& setting != null && Boolean.TRUE.equals(setting.getSubmittedSetting().getEnableUpdate())) {
				needGetLatest = true;
			}
			else {
				throw e;
			}
		}

		if (needGetLatest) {
			AnswerQuery answerQuery = new AnswerQuery();
			answerQuery.setProjectId(project.getId());
			answerQuery.setLatest(true);
			AnswerView latestAnswer = answerService.getAnswer(answerQuery);
			if (latestAnswer != null) {
				return latestAnswer;
			}
		}
		return null;
	}

	/** 如果存在白名单，答卷完更新白名单为已访问的状态，由于导入用户白名单没有系统用户id，需要将答案的创建人更新为答题参与表的id */
	private void updateProjectPartnerByAnswer(AnswerRequest request, ProjectView project) {
		if (project.getSetting() != null && project.getSetting().getAnswerSetting() != null) {
			Integer whitelistType = project.getSetting().getAnswerSetting().getWhitelistType();
			if (whitelistType == null) {
				return;
			}

			LambdaQueryWrapper<ProjectPartner> queryWrapper = Wrappers.<ProjectPartner>lambdaQuery()
					.eq(ProjectPartner::getProjectId, project.getId());
			if (ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType() == whitelistType) {
				queryWrapper.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId()).eq(ProjectPartner::getType,
						ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType());
				if (!SecurityContextUtils.isAuthenticated()) {
					return;
				}
			}
			else if (ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == whitelistType) {
				queryWrapper.eq(ProjectPartner::getUserName, request.getWhitelistName()).eq(ProjectPartner::getType,
						ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType());
			}

			ProjectPartner projectPartner = projectPartnerMapper.selectOne(queryWrapper);
			projectPartner.setStatus(AppConsts.ProjectPartnerStatus.ANSWERED);
			projectPartnerMapper.updateById(projectPartner);


			if (ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == whitelistType) {
				AnswerRequest answerUpdateRequest = new AnswerRequest();
				answerUpdateRequest.setId(request.getId());
				answerUpdateRequest.setCreateBy(projectPartner.getId());
				answerUpdateRequest.setProjectId(request.getProjectId());
				answerService.updateAnswer(answerUpdateRequest);
			}

		}
	}

}
