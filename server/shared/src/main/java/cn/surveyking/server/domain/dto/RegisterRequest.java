package cn.surveyking.server.domain.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;





@Data
public class RegisterRequest {

	private String name;




	private String phone;


	private String deptId;

	@NotBlank
	private String username;

	@NotBlank
	private String password;

	private String role;

}
