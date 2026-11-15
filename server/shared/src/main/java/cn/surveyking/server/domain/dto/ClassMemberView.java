package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;

/**
 * 班级成员列表行。
 *
 * <p>只给班主任/授权老师看本班学员，不返回手机号、邮箱等敏感资料。
 */
@Data
public class ClassMemberView {

	private String id;

	private String name;

	/** 登录账号 */
	private String username;

	/** 0 失活 / 1 激活 */
	private Integer status;

	private String deptId;

	private String deptName;

	/** 主班 id/名称（主班是 t_user.dept_id） */
	private String primaryDeptId;

	private String primaryDeptName;

	/** 兼报班（t_user_dept，不含主班，最多 2 个） */
	private List<String> extraDeptIds;

	private List<String> extraDeptNames;

	/** 当前行所在班是否就是主班 */
	private Boolean primary;

	/** 当前学员一共加入几个班（主班 + 兼报班） */
	private Integer classCount;

	/** 当前登录人能否调整这个学员的班级归属 */
	private Boolean canAssign;

	private String phone;

	private String email;

	private Date createAt;

	private List<String> roleNames;

}
