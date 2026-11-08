package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 班主任在班级里新增学员。
 *
 * <p>只允许建学员账号，角色由后端固定成系统内置学员角色，请求里不接受 roleIds。
 */
@Data
public class ClassMemberCreateRequest {

	private String deptId;

	private String name;

	private String username;

	private String password;

	private String phone;

	private String email;

}
