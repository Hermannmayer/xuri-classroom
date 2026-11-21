package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;









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
