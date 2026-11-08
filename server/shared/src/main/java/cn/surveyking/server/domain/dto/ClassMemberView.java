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

	private Date createAt;

	private List<String> roleNames;

}
