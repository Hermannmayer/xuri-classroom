package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * @author javahuang
 * @date 2021/11/2
 */
@Data
public class DeptView {

	private String id;

	private String parentId;

	/** org=用户组(教职工) class=班级(学员) */
	private String deptType;

	/** 是否开放学员自助注册（只对 teaching 班有意义） */
	private Boolean allowRegister;

	/** group=容器班 / teaching=教学班 */
	private String classKind;

	private String name;

	private String shortName;

	private String code;

	/** 负责人id */
	private String managerId;

	/** 负责人名字 */
	private String managerName;

	private String remark;

	/** 拓展属性 */
	private String propertyJson;

	private java.util.Date validFrom;

	private java.util.Date validTo;

	/** 该组绑定的角色 id，用户组编辑页回显用 */
	private java.util.List<String> roleIds;

	/** 角色名称，列表展示用 */
	private java.util.List<String> roleNames;

}
