package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class UserTokenView {

	private String userId;

	public UserTokenView() {
	}

	public UserTokenView(String userId) {
		this.userId = userId;
	}

}
