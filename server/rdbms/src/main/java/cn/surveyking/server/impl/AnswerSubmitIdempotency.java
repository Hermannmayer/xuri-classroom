package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.IPUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.WebUtils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;








@Component
@RequiredArgsConstructor
public class AnswerSubmitIdempotency {


	private static final long SUBMIT_IDEMPOTENCY_WINDOW_MS = 15 * 1000L;


	private static final int SUBMIT_IDEMPOTENCY_MAX_ENTRIES = 2000;

	private final ProjectService projectService;


	private final ConcurrentMap<String, Object> submitLocks = new ConcurrentHashMap<>();


	private final ConcurrentMap<String, RecentSubmit> recentSubmits = new ConcurrentHashMap<>();

	public Object lockFor(String idempotencyKey) {
		return submitLocks.computeIfAbsent(idempotencyKey, key -> new Object());
	}

	public void releaseLock(String idempotencyKey, Object lock) {
		submitLocks.remove(idempotencyKey, lock);
	}

	/** 提交幂等键 = 项目 + 答题人 + 答案指纹 */
	public String buildSubmitIdempotencyKey(AnswerRequest request) {

		if (Boolean.TRUE.equals(request.getFreshAttempt())) {
			return null;
		}
		String projectId = request.getProjectId();
		if (!StringUtils.hasText(projectId) || ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)) {
			return null;
		}
		String actor = resolveSubmitActor(projectId);
		if (!StringUtils.hasText(actor)) {


			return null;
		}

		int fingerprint = Objects.hash(request.getAnswer(), request.getTempSave());
		return projectId + "|" + actor + "|" + fingerprint;
	}

	/** 提交幂等用的「答题人」标识：登录用户 → 设备限次 cookie → 考试模式退化为 IP+UA */
	private String resolveSubmitActor(String projectId) {
		String userId = SecurityContextUtils.getUserId();
		if (StringUtils.hasText(userId)) {
			return "u:" + userId;
		}
		HttpServletRequest httpRequest = currentRequestQuietly();
		if (httpRequest == null) {
			return null;
		}
		Cookie limitCookie = WebUtils.getCookie(httpRequest, AppConsts.COOKIE_LIMIT_NAME);
		if (limitCookie != null && StringUtils.hasText(limitCookie.getValue())) {
			return "c:" + limitCookie.getValue();
		}
		ProjectView project = projectService.getProject(projectId);
		if (project != null && ProjectModeEnum.exam.equals(project.getMode())
				&& !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)) {
			String ip = IPUtils.getClientIpAddress(httpRequest);
			if (StringUtils.hasText(ip)) {
				String agent = httpRequest.getHeader("User-Agent");
				return "ip:" + ip + "|" + (agent == null ? "" : Integer.toHexString(agent.hashCode()));
			}
		}
		return null;
	}

	private HttpServletRequest currentRequestQuietly() {
		try {
			return ContextHelper.getCurrentHttpRequest();
		}
		catch (Exception e) {
			return null;
		}
	}

	/** 窗口内重复提交：直接回放第一次的应答（连 examScore 一起回放，前端拿到的结果一致） */
	public AnswerView replayRecentSubmit(String idempotencyKey) {
		RecentSubmit recent = recentSubmits.get(idempotencyKey);
		if (recent == null) {
			return null;
		}
		if (System.currentTimeMillis() - recent.at > SUBMIT_IDEMPOTENCY_WINDOW_MS) {
			recentSubmits.remove(idempotencyKey, recent);
			return null;
		}
		AnswerView view = new AnswerView();
		view.setId(recent.answerId);
		view.setExamScore(recent.examScore);
		view.setExamInfo(recent.examInfo);
		return view;
	}

	public void rememberSubmit(String idempotencyKey, AnswerView created) {
		long now = System.currentTimeMillis();
		recentSubmits.put(idempotencyKey,
				new RecentSubmit(created.getId(), created.getExamScore(), created.getExamInfo(), now));
		if (recentSubmits.size() > SUBMIT_IDEMPOTENCY_MAX_ENTRIES) {
			recentSubmits.entrySet().removeIf(entry -> now - entry.getValue().at > SUBMIT_IDEMPOTENCY_WINDOW_MS);
		}
	}


	private static final class RecentSubmit {

		private final String answerId;

		private final Double examScore;

		private final AnswerExamInfo examInfo;

		private final long at;

		private RecentSubmit(String answerId, Double examScore, AnswerExamInfo examInfo, long at) {
			this.answerId = answerId;
			this.examScore = examScore;
			this.examInfo = examInfo;
			this.at = at;
		}

	}

}
