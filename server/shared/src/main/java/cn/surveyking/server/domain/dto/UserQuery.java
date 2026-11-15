package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * @author javahuang
 * @date 2021/10/15
 */
@Data
@EqualsAndHashCode(callSuper = false)
public class UserQuery extends PageQuery {

	private String name;

	/** staff / student：用户管理传 staff，班级成员传 student */
	private String userType;

	/** 账号状态：1 正常 / 0 待审核或停用；为空表示不筛选 */
	private Integer status;

	private String deptId;

	private String[] ids;

	private String roleId;

	private String neRoleId;

}
