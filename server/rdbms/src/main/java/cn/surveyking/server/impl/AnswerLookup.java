package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.service.AnswerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Objects;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;









@Component
@RequiredArgsConstructor
public class AnswerLookup {

	private final AnswerService answerService;

	private final AnswerMapper answerMapper;

	public AnswerView getAnswerForProject(String projectId, String answerId) {
		return getAnswerForProject(projectId, answerId, false);
	}

	/** 取历史答卷：查不到或已被删除返回 null，由调用方按「没有历史答卷」降级；存在但不属于当前访问者仍抛越权异常，避免把异常吞进事务导致提交失败 */
	public AnswerView findAnswerForProject(String projectId, String answerId) {
		if (isBlank(answerId) || answerMapper.selectById(answerId) == null) {
			return null;
		}
		return getAnswerForProject(projectId, answerId);
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


		assertAnswerOwnership(answerView);
		if (rankEnabled) {
			answerQuery.setRankEnabled(true);
			return answerService.getAnswer(answerQuery);
		}
		return answerView;
	}

	/** 答卷归属校验 */
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


		String resultAnswerId = ContextHelper
				.getCookie(AppConsts.COOKIE_RESULT_PREFIX + answerView.getProjectId());
		if (isNotBlank(resultAnswerId) && Objects.equals(resultAnswerId, answerView.getId())) {
			return;
		}


		throw new AccessDeniedException("无权访问该答卷");
	}

}
