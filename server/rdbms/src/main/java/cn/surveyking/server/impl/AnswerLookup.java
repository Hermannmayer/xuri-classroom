package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.service.AnswerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Objects;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 按项目读取答卷，并校验这份答卷属于当前访问者。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 拆出的第一块：答题页加载、交卷、成绩单三条读答案的路径共用这一段。
 * 归属校验集中在这里，是因为 {@code answerId} 会出现在成绩单 URL 里，而公开接口是 permitAll，
 * 只校验「属于该项目」等于谁拿到 UUID 谁就能读别人的答卷。
 */
@Component
@RequiredArgsConstructor
public class AnswerLookup {

	private final AnswerService answerService;

	public AnswerView getAnswerForProject(String projectId, String answerId) {
		return getAnswerForProject(projectId, answerId, false);
	}

	public AnswerView getAnswerForProject(String projectId, String answerId, boolean rankEnabled) {
		if (isBlank(projectId) || isBlank(answerId)) {
			throw new AccessDeniedException("无权限访问该答案");
		}
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setId(answerId);
		AnswerView answerView = answerService.getAnswer(answerQuery);
		if (answerView == null || !Objects.equals(projectId, answerView.getProjectId())) {
			throw new AccessDeniedException("无权限访问该答案");
		}
		// 归属校验：只校验「属于该项目」是不够的——answerId 会出现在成绩单 URL 里，
		// 拿到别人的 answerId 就能读/改别人的答卷（公开接口是 permitAll）。
		assertAnswerOwnership(answerView);
		if (rankEnabled) {
			answerQuery.setRankEnabled(true);
			return answerService.getAnswer(answerQuery);
		}
		return answerView;
	}

	/**
	 * 答卷归属校验。
	 *
	 * <p>合法持有者只有两种：
	 * <ol>
	 * <li>登录用户本人（答卷 createBy 等于当前用户；白名单导入的答卷 createBy 是 partner id，
	 * 靠 {@link AnswerLimitGuard#validateWhitelistLimit} 的同一套 createBy 语义判断）；</li>
	 * <li>匿名用户本机：浏览器里存着这份答卷的 id（答题时的随机卷 cookie
	 * {@code rd_answer_id_<projectId>}，或前端 localStorage 走后端暂存时下发的同名 cookie）。</li>
	 * </ol>
	 * 两者都不成立一律拒绝，避免「知道 UUID 就能看别人答案」。
	 */
	private void assertAnswerOwnership(AnswerView answerView) {
		String userId = SecurityContextUtils.getUserId();
		if (isNotBlank(userId) && Objects.equals(userId, answerView.getCreateBy())) {
			return;
		}
		String cookieAnswerId = ContextHelper
				.getCookie(AppConsts.COOKIE_RANDOM_PROJECT_PREFIX + answerView.getProjectId());
		if (isNotBlank(cookieAnswerId) && Objects.equals(cookieAnswerId, answerView.getId())) {
			return;
		}
		// 白名单场景：答卷 createBy 是 partner 记录 id，由访问白名单的 cookie 关联，这里不做额外放行，
		// 登录态用户也不会命中（userId != partner id），故统一走拒绝。
		throw new AccessDeniedException("无权访问该答卷");
	}

}
