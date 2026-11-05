package cn.surveyking.server.domain.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * @author javahuang
 * @date 2022/4/10
 */
@Data
public class RegisterRequest {

	private String name;

	/**
	 * 手机号（同时作为登录账号）
	 */
	private String phone;

	@NotBlank
	private String username;

	@NotBlank
	private String password;

	private String role;

}
