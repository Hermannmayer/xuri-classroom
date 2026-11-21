package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class ClassMemberUpdateRequest {

	private String deptId;

	private String id;

	private String name;

	private String phone;

	private String email;


	private Integer status;


	private String password;

}
