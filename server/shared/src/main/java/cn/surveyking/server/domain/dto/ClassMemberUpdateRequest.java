package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 班级管理里编辑学员：只开放姓名、联系方式、状态与重置密码。
 * 角色和所属组不在这里改，避免班主任借编辑学员提权。
 */
@Data
public class ClassMemberUpdateRequest {

	private String deptId;

	private String id;

	private String name;

	private String phone;

	private String email;

	/** 0 失活 / 1 激活；null 表示不改 */
	private Integer status;

	/** 非空表示重置密码 */
	private String password;

}
