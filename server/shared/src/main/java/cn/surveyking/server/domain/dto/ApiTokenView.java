package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;











@Data
public class ApiTokenView {

	private String id;


	private String name;


	private String userId;


	private String userName;


	private String tokenPrefix;


	private String tokenSuffix;


	private String maskedToken;


	private String scopes;

	private Date expiresAt;

	private Date lastUsedAt;


	private Boolean revoked;

	private Date createAt;






	private String token;

}
