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

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 提交幂等：同一（项目 + 答题人 + 答案指纹）在 15 秒窗口内重复新建，直接回放第一次的答卷。
 *
 * <p>
 * 从 {@code AnswerServiceImpl} 切出。锁与回放快照都是纯内存状态，跟着组件走； 调用方仍然负责「先取键 → 加锁 → 查回放 → 新建 →
 * 记回放」的顺序， 组件不回调 {@code AnswerService}，因此不存在构造器循环依赖。
 */
@Component
@RequiredArgsConstructor
public class AnswerSubmitIdempotency {

	/** 提交幂等窗口：同一（项目 + 答题人 + 答案指纹）在窗口内重复新建，直接回放第一次的答卷 */
	private static final long SUBMIT_IDEMPOTENCY_WINDOW_MS = 15 * 1000L;

	/** 幂等表容量上限，超过就清一次过期项（单实例内存表，防止长跑进程膨胀） */
	private static final int SUBMIT_IDEMPOTENCY_MAX_ENTRIES = 2000;

	private final ProjectService projectService;

	/** 幂等键 → 提交锁：双击/重试的第二枪会等第一枪跑完再走回放分支 */
	private final ConcurrentMap<String, Object> submitLocks = new ConcurrentHashMap<>();

	/** 幂等键 → 最近一次成功新建的答卷（用于回放，不依赖数据库是否已经可见） */
	private final ConcurrentMap<String, RecentSubmit> recentSubmits = new ConcurrentHashMap<>();

	public Object lockFor(String idempotencyKey) {
		return submitLocks.computeIfAbsent(idempotencyKey, key -> new Object());
	}

	public void releaseLock(String idempotencyKey, Object lock) {
		submitLocks.remove(idempotencyKey, lock);
	}

	/**
	 * 提交幂等键 = 项目 + 答题人 + 答案指纹。
	 *
	 * <p>
	 * 刻意不加数据库唯一键：存量库里本来就可能有重复答卷（历史 bug 已经产生过），唯一索引会让
	 * 迁移直接失败；而且「网络重试」和「用户真的想再交一次」在库里无法区分。所以这里只做应用层的 15 秒窗口合并 ——
	 * 防的是双击与重试这类误操作，不是强一致保证（服务重启/多实例即失效）。
	 *
	 * <p>
	 * 返回 null 表示本次不做幂等：显式「再考一次」、题库练习、以及拿不到可信答题人身份的情况。
	 */
	public String buildSubmitIdempotencyKey(AnswerRequest request) {
		// 「再考一次」是用户显式要一条新答卷，必须绕过幂等
		if (Boolean.TRUE.equals(request.getFreshAttempt())) {
			return null;
		}
		String projectId = request.getProjectId();
		if (!StringUtils.hasText(projectId) || ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)) {
			return null;
		}
		String actor = resolveSubmitActor(projectId);
		if (!StringUtils.hasText(actor)) {
			// 既没登录、也没有设备 cookie：无法安全区分「同一个人的两次提交」和「两个人的相同答案」，
			// 宁可放弃合并，也不能把别人的答卷回放给你。
			return null;
		}
		// 答案内容必须一致才合并：用户真改了答案立刻再交，仍然要产生新答卷
		int fingerprint = Objects.hash(request.getAnswer(), request.getTempSave());
		return projectId + "|" + actor + "|" + fingerprint;
	}

	/**
	 * 提交幂等用的「答题人」标识：登录用户 → 设备限次 cookie → 考试模式退化为 IP+UA。
	 *
	 * <p>
	 * 匿名且没有设备 cookie 时只有考试模式才用 IP+UA 兜底：考试重复交卷的代价更高； 问卷模式不合并，否则同一个教室 NAT
	 * 下两个答案相同的受访者会被吞掉一份。
	 */
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

	/** 幂等回放需要的最小应答快照（此刻数据库可能还没提交完成，读不到行） */
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
