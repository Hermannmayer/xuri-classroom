package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 班主任在班级里新增学员。
 *
 * <p>只允许建学员账号，角色由后端固定成系统内置学员角色，请求里不接受 roleIds。
 *
 * <p>学员的登录账号就是手机号：{@link #phone} 必填（11 位大陆手机号），服务端会把
 * 账号名强制写成手机号；{@link #username} 只为兼容旧前端保留，服务端一律忽略。
 */
@Data
public class ClassMemberCreateRequest {

	private String deptId;

	private String name;

	/** 已废弃：登录账号由手机号决定，服务端忽略该字段 */
	private String username;

	private String password;

	/** 手机号，同时作为登录账号；必填，格式 ^1[3-9]\d{9}$ */
	private String phone;

	private String email;

}
