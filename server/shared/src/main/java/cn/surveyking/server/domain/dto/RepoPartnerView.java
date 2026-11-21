package cn.surveyking.server.domain.dto;

import lombok.Data;

@Data
public class RepoPartnerView {

	private String id;

	private UserInfo user;

	private String userId;


	private String deptId;


	private String deptName;


	private String userType;


	private String deptType;


	private Integer accessLevel;

}
