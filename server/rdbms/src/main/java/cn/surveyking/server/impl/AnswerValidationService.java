package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.service.AnswerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;













@Component
@RequiredArgsConstructor
public class AnswerValidationService {

	private final AnswerService answerService;


	/** 提交阶段的校验：只做「还能不能交」相关的判断，不做登录/cookie/ip 限次 （那些是"能不能开始答"的约束，修改已有答卷时不该再拦一次） */
	public void validateSubmittable(ProjectView project, boolean isNewAnswer) {
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		ProjectSetting setting = project.getSetting();
		if (setting == null || setting.getAnswerSetting() == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		if (setting.getStatus() != null && setting.getStatus() == 0) {
			throw new ErrorCodeException(ErrorCode.SurveySuspend);
		}
		Long endTime = setting.getAnswerSetting().getEndTime();
		if (endTime != null && System.currentTimeMillis() > endTime) {
			throw new ErrorCodeException(ErrorCode.ExceededEndTime);
		}
		if (isNewAnswer) {
			Long maxAnswers = setting.getAnswerSetting().getMaxAnswers();
			if (maxAnswers != null) {
				AnswerQuery answerQuery = new AnswerQuery();
				answerQuery.setProjectId(project.getId());
				if (answerService.count(answerQuery) >= maxAnswers) {
					throw new ErrorCodeException(ErrorCode.ExceededMaxAnswers);
				}
			}
		}
	}

}