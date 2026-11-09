package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.security.SurveyWechatCookieService;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.OAuthSetting;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveyWechatIdentity;
import cn.surveyking.server.service.SystemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.apache.commons.lang3.StringUtils;

import javax.servlet.http.HttpServletRequest;
import javax.validation.ValidationException;
import java.util.LinkedHashMap;

/**
 * 微信内打开问卷时的访问控制。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 抽出的第一块：只依赖「系统 OAuth 配置」与「微信 cookie 身份」，
 * 不碰答卷、不碰统计，是原类里耦合最少的一组职责。逻辑与原实现逐行一致，仅换了宿主类。
 */
@Component
@RequiredArgsConstructor
public class WechatAccessGuard {

	private final SurveyWechatCookieService surveyWechatCookieService;

	private final SystemService systemService;

	/** 答题页是否需要先做微信授权（用于决定是否提前把题目清空、返回授权标记） */
	public boolean wechatAccessRequired(ProjectView project) {
		if (!isWechatOnly(project)) {
			return false;
		}
		if (!isWechatRequest()) {
			return true;
		}
		if (!isWechatOfficialEnabled()) {
			return false;
		}
		return resolveSurveyWechatIdentity(project) == null;
	}

	/** 强校验：不满足就抛（非微信打开、未授权等） */
	public SurveyWechatIdentity requireWechatAccess(ProjectView project) {
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		if (!isWechatOnly(project)) {
			return null;
		}
		if (!isWechatRequest()) {
			throw new ValidationException("只能在微信中打开");
		}
		if (!isWechatOfficialEnabled()) {
			return null;
		}
		SurveyWechatIdentity identity = resolveSurveyWechatIdentity(project);
		if (identity == null) {
			throw new ValidationException("请先完成微信授权");
		}
		return identity;
	}

	/** 把微信身份写进答案（openid / 昵称 / 头像），非微信场景什么都不做 */
	public void applyWechatIdentity(ProjectView project, AnswerRequest request, SurveyWechatIdentity identity) {
		if (!isWechatOnly(project) || !isWechatOfficialEnabled()) {
			return;
		}
		if (request.getAnswer() == null) {
			request.setAnswer(new LinkedHashMap<>());
		}
		request.getAnswer().remove("openid");
		request.getAnswer().remove("wechatNickname");
		request.getAnswer().remove("wechatAvatarUrl");
		if (identity != null && Boolean.TRUE.equals(project.getSetting().getAnswerSetting().getWechatUserInfo())) {
			request.getAnswer().put("openid", identity.getOpenId());
			request.getAnswer().put("wechatNickname", identity.getNickname());
			request.getAnswer().put("wechatAvatarUrl", identity.getAvatarUrl());
		}
	}

	public boolean isWechatOnly(ProjectView project) {
		return project != null && project.getSetting() != null && project.getSetting().getAnswerSetting() != null
				&& Boolean.TRUE.equals(project.getSetting().getAnswerSetting().getWechatOnly());
	}

	public boolean isWechatOfficialEnabled() {
		OAuthSetting setting = systemService.getSystemOAuthSetting();
		OAuthSetting.WechatClient client = setting == null ? null : setting.getWechatOfficial();
		return setting != null && StringUtils.isNotBlank(setting.getPublicBaseUrl()) && client != null
				&& Boolean.TRUE.equals(client.getEnabled()) && StringUtils.isNotBlank(client.getAppId())
				&& StringUtils.isNotBlank(client.getAppSecret());
	}

	public boolean isWechatRequest() {
		HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
		return request != null && StringUtils.containsIgnoreCase(
				StringUtils.defaultString(request.getHeader(HttpHeaders.USER_AGENT)), "micromessenger");
	}

	private SurveyWechatIdentity resolveSurveyWechatIdentity(ProjectView project) {
		SurveyWechatIdentity identity = surveyWechatCookieService.resolve(ContextHelper.getCurrentHttpRequest());
		if (identity == null || !StringUtils.equals(project.getId(), identity.getProjectId())
				|| !StringUtils.isNotBlank(identity.getOpenId())) {
			return null;
		}
		ProjectSetting.AnswerSetting answerSetting = project.getSetting().getAnswerSetting();
		if (Boolean.TRUE.equals(answerSetting.getWechatUserInfo()) && !identity.isUserInfoCollected()) {
			return null;
		}
		return identity;
	}

}