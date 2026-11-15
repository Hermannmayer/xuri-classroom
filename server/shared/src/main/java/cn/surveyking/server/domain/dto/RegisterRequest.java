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

	/** 注册目标班级 id（t_dept.id，dept_type=class 且 allow_register=1） */
	private String deptId;

	@NotBlank
	private String username;

	@NotBlank
	private String password;

	private String role;

}
