package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 答卷视图装配。
 *
 * <p>
 * 从 {@code AnswerServiceImpl} 切出的第一小步：只包含「补齐作答人姓名」。
 * 这块的取舍是手工搬、一次一个方法——上一轮批量脚本搬迁因为
 * {@code parseSurveySchemaByType} 有重载而失败，教训是这里不适合脚本。
 */
@Component
@RequiredArgsConstructor
public class AnswerAssembler {

	private final UserService userService;

	private final ProjectPartnerMapper projectPartnerMapper;

	/** 作答人可能是学员（t_user），也可能是协作成员（t_project_partner），两种都要兜住 */
	public void setUserName(AnswerView answerView) {
		if (answerView.getCreateBy() != null) {
			UserInfo userInfo = userService.loadUserById(answerView.getCreateBy());
			if (userInfo != null) {
				answerView.setCreateByName(userInfo.getName());
				return;
			}
			ProjectPartner projectPartner = projectPartnerMapper.selectById(answerView.getCreateBy());
			if (projectPartner != null) {
				answerView.setCreateByName(projectPartner.getUserName());
				return;
			}
		}
	}

}
