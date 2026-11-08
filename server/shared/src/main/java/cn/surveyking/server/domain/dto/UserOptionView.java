package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 只读的用户候选项：授权选人、班级分配老师用。
 *
 * <p>不返回手机号/邮箱/角色明细，避免把 system:user:list 的数据面暴露给只有 user:select 的角色。
 */
@Data
public class UserOptionView {

	private String id;

	private String name;

	private String username;

	private String deptName;

}
