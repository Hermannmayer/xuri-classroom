package cn.surveyking.server.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;




@Data
@NoArgsConstructor
@AllArgsConstructor
public class SurveyWechatIdentity {

	private String projectId;

	private String openId;

	private String nickname;

	private String avatarUrl;

	private boolean userInfoCollected;

}
