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

	private String authorityMode;

	private String authority;

	private java.util.Date validFrom;

	private java.util.Date validTo;

	/** 该组绑定的角色 id，用户组编辑页回显用 */
	private java.util.List<String> roleIds;

	/** 角色名称，列表展示用 */
	private java.util.List<String> roleNames;

}
