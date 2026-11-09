package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.service.AnswerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 交卷前的准入校验：问卷是否停用、是否过截止时间、是否超过回收上限。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 抽出的第四块。它只读项目设置 + count 一次答卷，
 * 不碰答案内容、不碰统计，是最容易独立出来的一段交卷逻辑。
 *
 * <p>
 * 同文件里的另外三个校验方法（validateAnswer / validateAndMergeAnswer / validateAnswerGate）没有一起搬：
 * 前者要调 statProject（会造成构造器循环依赖），后者依赖 getAnswerForProject 与三个限次方法，
 * 而那几处方法同时被别的入口复用，搬迁需要先给交卷链路补测试。
 */
@Component
@RequiredArgsConstructor
public class AnswerValidationService {

	private final AnswerService answerService;


	/**
	 * 提交阶段的校验：只做「还能不能交」相关的判断，不做登录/cookie/ip 限次
	 * （那些是"能不能开始答"的约束，修改已有答卷时不该再拦一次）。
	 *
	 * @param project 项目
	 * @param isNewAnswer true=新建答卷，才校验回收上限；false=修改已有答卷
	 */
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