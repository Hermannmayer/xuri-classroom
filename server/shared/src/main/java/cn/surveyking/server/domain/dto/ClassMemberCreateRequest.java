package cn.surveyking.server.domain.dto;

import lombok.Data;









@Data
public class ClassMemberCreateRequest {

	private String deptId;

	private String name;


	private String username;

	private String password;


	private String phone;

	private String email;

}
