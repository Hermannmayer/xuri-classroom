package cn.surveyking.server.domain.dto;

import lombok.Data;







@Data
public class ApiTokenRequest {


	private String id;


	private String name;








	private String scopes;








	private String expiresAt;

}
