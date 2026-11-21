package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;





@Data
@EqualsAndHashCode(callSuper = false)
public class UserQuery extends PageQuery {

	private String name;


	private String userType;


	private Integer status;

	private String deptId;

	private String[] ids;

	private String roleId;

	private String neRoleId;

}
