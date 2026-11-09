package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.Tuple2;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.CronHelper;
import cn.surveyking.server.core.uitls.IPUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.service.AnswerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.UUID;

/**
 * 答题限次与密码闸门：登录用户 / cookie / IP / 白名单四种限次，以及「本机已通过密码」的短时凭据。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 拆出的第二块。它只算窗口、数答卷、读写 cookie，不碰答案内容，
 * 因此答题页加载与交卷两条路径都能复用。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AnswerLimitGuard {

	private final AnswerService answerService;

	public void validateLoginLimit(String projectId, ProjectSetting setting) {
		String userId = SecurityContextUtils.getUserId();
		if (userId == null) {
			log.info("user is empty");
			return;
		}
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setCreateBy(userId);
		doValidate(setting, query, setting.getAnswerSetting().getLoginLimit());
	}

	public void validateCookieLimit(String projectId, ProjectSetting setting) {
		HttpServletRequest request = ContextHelper.getCurrentHttpRequest();

		Cookie limitCookie = WebUtils.getCookie(request, AppConsts.COOKIE_LIMIT_NAME);
		if (limitCookie == null) {
			// 添加 cookie
			HttpServletResponse response = ContextHelper.getCurrentHttpResponse();

			final Cookie cookie = new Cookie(AppConsts.COOKIE_LIMIT_NAME, UUID.randomUUID().toString());
			cookie.setPath("/");
			cookie.setMaxAge(100 * 360 * 24 * 60 * 60);
			cookie.setHttpOnly(true);
			response.addCookie(cookie);
			response.addCookie(cookie);
			return;
		}
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setCookie(limitCookie.getValue());
		doValidate(setting, query, setting.getAnswerSetting().getCookieLimit());
	}

	public void validateIpLimit(String projectId, ProjectSetting setting) {
		HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
		String ip = IPUtils.getClientIpAddress(request);
		if (ip == null) {
			log.info("ip is empty");
			return;
		}
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setIp(ip);
		doValidate(setting, query, setting.getAnswerSetting().getIpLimit());
	}

	public void validateWhitelistLimit(String projectId, ProjectSetting setting) {
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		// 如果白名单校验成功，导入用户获取partner表的id，系统用户是当前登录用户 id
		String createBy = (String) ContextHelper.getCurrentHttpRequest().getAttribute("createBy");
		if (createBy != null) {
			query.setCreateBy(createBy);
			doValidate(setting, query, setting.getAnswerSetting().getWhitelistLimit());
		}
	}

	private void doValidate(ProjectSetting setting, AnswerQuery query, ProjectSetting.UniqueLimitSetting limitSetting) {
		// 通过 cron 计算时间窗
		CronHelper helper = new CronHelper(limitSetting.getLimitFreq().getCron());
		Tuple2<LocalDateTime, LocalDateTime> currentWindow = helper.currentWindow();
		if (currentWindow != null) {
			query.setStartTime(Date.from(currentWindow.getFirst().atZone(ZoneId.systemDefault()).toInstant()));
			query.setEndTime(Date.from(currentWindow.getSecond().atZone(ZoneId.systemDefault()).toInstant()));
		}
		long total = answerService.count(query);
		// 允许修改答案的话就获取最近一次的答案，不抛出异常
		if (setting.getSubmittedSetting() != null
				&& Boolean.TRUE.equals(setting.getSubmittedSetting().getEnableUpdate())) {
			return;
		}
		if (limitSetting.getLimitNum() != null && total >= limitSetting.getLimitNum()) {
			throw new ErrorCodeException(ErrorCode.SurveySubmitted);
		}
	}

	/** 记录「本机已通过某问卷的密码」：cookie 存哈希，不存明文，2 小时有效 */
	public void markPasswordPassed(String projectId, String password) {
		try {
			String value = sha256(projectId + "|" + password);
			Cookie cookie = new Cookie(AppConsts.COOKIE_PWD_PREFIX + projectId, value);
			cookie.setPath("/");
			cookie.setMaxAge(2 * 3600);
			cookie.setHttpOnly(true);
			ContextHelper.getCurrentHttpResponse().addCookie(cookie);
		}
		catch (Exception e) {
			log.warn("写入问卷密码通过标记失败: projectId={}", projectId, e);
		}
	}

	public boolean isPasswordPassed(String projectId, String password) {
		try {
			String expected = sha256(projectId + "|" + password);
			String actual = ContextHelper.getCookie(AppConsts.COOKIE_PWD_PREFIX + projectId);
			return expected.equals(actual);
		}
		catch (Exception e) {
			return false;
		}
	}

	private static String sha256(String text) {
		try {
			java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
			StringBuilder sb = new StringBuilder(hash.length * 2);
			for (byte b : hash) {
				sb.append(String.format("%02x", b));
			}
			return sb.toString();
		}
		catch (Exception e) {
			throw new IllegalStateException(e);
		}
	}

}
