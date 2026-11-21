package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class ProjectPartnerView {

	private String id;

	private Integer type;

	private UserInfo user;

	private String userName;

	private Integer status;

	private String userId;


	private Integer accessLevel;

}
