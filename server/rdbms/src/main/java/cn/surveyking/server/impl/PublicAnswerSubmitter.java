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

import javax.servlet.http.Cookie;
import java.util.LinkedHashMap;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 交卷与暂存：提交前的闸门、答案落库、考试判分与错题归档、白名单回写。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 拆出的第七块。校验逻辑都在 {@link ProjectAnswerValidator} 里，
 * 这里只负责「按哪条路径交卷」和落库后的收尾，因此仍然是全链路唯一带
 * {@code rollbackFor = Exception.class} 的入口。
 */
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
		// 提交也要校验问卷状态/截止时间：此前只有 loadProject 挡，拿到 projectId 直接 POST 就能绕过
		answerValidationService.validateSubmittable(project, !isNotBlank(request.getId()));
		// 密码 / 需要登录 / 白名单 / 开始时间：同样要在提交路径再判一次
		projectAnswerValidator.validateAnswerGate(project, !isNotBlank(request.getId()));
		SurveyWechatIdentity wechatIdentity = wechatAccessGuard.requireWechatAccess(project);
		wechatAccessGuard.applyWechatIdentity(project, request, wechatIdentity);
		String answerId = request.getId();
		// 随机问卷更新答案
		String randomSurveyCookieName = AppConsts.COOKIE_RANDOM_PROJECT_PREFIX + project.getId();
		String answerIdFromCookie = ContextHelper.getCookie(randomSurveyCookieName);
		if (isNotBlank(answerIdFromCookie)) {
			answerLookup.getAnswerForProject(projectId, answerIdFromCookie);
			answerId = answerIdFromCookie;
		}
		else if (isNotBlank(request.getQueryId())) {
			// 公开查询修改答案
			projectAnswerValidator.validateAndMergeAnswer(project, request);
		}
		else if (isNotBlank(request.getId())
				&& !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(request.getProjectId())) {
			// 传入答案ID 并且设置了允许修改答案，则可以修改问卷答案
			answerLookup.getAnswerForProject(projectId, request.getId());
			boolean enableUpdate = Boolean.TRUE.equals(project.getSetting().getSubmittedSetting().getEnableUpdate());
			// 暂存(tempSave=0)允许覆盖自己未提交的草稿，否则「答一半续上」会被 AnswerChangeDisabled 拦住
			boolean tempSaving = Integer.valueOf(0).equals(request.getTempSave());
			if (!enableUpdate && !tempSaving) {
				throw new ErrorCodeException(ErrorCode.AnswerChangeDisabled);
			}
		}
		else {
			// 「再考一次」= 新一轮作答：跳过「取本用户最近一份再 updateById」的复用逻辑，直接新建一条答卷，
			// 历史成绩保留；校验逻辑与原来一致（问卷是否可交、答案是否合法）。
			if (Boolean.TRUE.equals(request.getFreshAttempt())) {
				projectAnswerValidator.validateProject(project);
				projectAnswerValidator.validateAnswer(project, request);
			}
			else {
				// 问卷允许修改答案 开关修改答案
				AnswerView latestAnswer = validateAndGetLatestAnswer(project, request);
				if (latestAnswer != null) {
					answerId = latestAnswer.getId();
				}
			}
		}

		// 保存答案
		request.setId(answerId);
		AnswerView answerView = answerService.saveAnswer(request);
		result.setAnswerId(answerView.getId());
		// 闯关模式：服务端裁决超时题（计 0 分，并把每题用时/超时清单落到 metaInfo）
		examControlService.applyPassModePenalty(project, request, answerView);
		// 考试模式，计算分值传给前端
		if (ProjectModeEnum.exam.equals(project.getMode())
				&& !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)) {
			result.setExamScore(answerView.getExamScore());
			result.setQuestionScore(answerView.getExamInfo().getQuestionScore());
			// 计算错题：带上本次答案与 schema，才能排除「未作答」并按考试维度归档
			AnswerExamInfo answerExamInfo = answerView.getExamInfo();
			LinkedHashMap<String, Double> questionScore = answerExamInfo.getQuestionScore();
			userBookService.saveWrongQuestion(questionScore, answerView.getAnswer(),
					answerView.getSurvey() != null ? answerView.getSurvey() : project.getSurvey(), project.getId(),
					null);
		}
		// 白名单更新答题信息
		request.setId(answerView.getId());
		updateProjectPartnerByAnswer(request, project);
		// 完事儿删除 cookie 标识
		if (isNotBlank(answerIdFromCookie)) {
			Cookie cookie = new Cookie(randomSurveyCookieName, answerIdFromCookie);
			cookie.setMaxAge(0);
			ContextHelper.getCurrentHttpResponse().addCookie(cookie);
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
			// 目前仅支持登录用户后端暂存
			return;
		}
		answerLookup.getAnswerForProject(projectId, answerId);
		AnswerRequest answerRequest = new AnswerRequest();
		answerRequest.setId(answerId);
		answerRequest.setTempSave(0);
		// updateAnswer 链路会按 projectId 取项目，漏传会 NPE
		answerRequest.setProjectId(projectId);
		answerRequest.setTempAnswer(request.getTempAnswer());
		answerService.updateAnswer(answerRequest);
	}

	/**
	 * 校验问卷并且判断是否要更新最近一次的答案
	 * @param project
	 * @param request
	 * @return 最近一次的答案
	 */
	private AnswerView validateAndGetLatestAnswer(ProjectView project, AnswerRequest request) {
		ProjectSetting setting = project.getSetting();
		boolean needGetLatest = false;
		try {
			projectAnswerValidator.validateProject(project);
			projectAnswerValidator.validateAnswer(project, request);
			// 未设时间限制&需要登录&可以修改，永远修改的是同一份
			if (SecurityContextUtils.isAuthenticated() && setting != null
					&& Boolean.TRUE.equals(setting.getSubmittedSetting().getEnableUpdate())) {
				needGetLatest = true;
			}
		}
		catch (ErrorCodeException e) {
			// 如果设置了时间限制，只能修改某个时间区间内的问卷
			// 登录&问卷已提交&允许修改，则可以继续修改
			if (ErrorCode.SurveySubmitted.equals(e.getErrorCode()) && SecurityContextUtils.isAuthenticated()
					&& setting != null && Boolean.TRUE.equals(setting.getSubmittedSetting().getEnableUpdate())) {
				needGetLatest = true;
			}
			else {
				throw e;
			}
		}
		// 获取最近一份的问卷执行答案更新操作
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

	/**
	 * 如果存在白名单，答卷完更新白名单为已访问的状态，由于导入用户白名单没有系统用户id，需要将答案的创建人更新为答题参与表的id。
	 * @param request
	 * @param project
	 */
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

			// 白名单导入用户答题需要更新答案表的 createBy 为 partner 的 id
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
