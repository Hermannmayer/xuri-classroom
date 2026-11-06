package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * @author javahuang
 * @date 2021/10/6
 */
@Data
public class DeptRequest {

	private String id;

	private String parentId;

	private String name;

	private String shortName;

	private String code;

	/** 负责人id */
	private String managerId;

	private String remark;

	/** 拓展属性 */
	private String propertyJson;

	/** 有效期开始（可空=不限制） */
	private java.util.Date validFrom;

	/** 有效期结束（可空=永久有效） */
	private java.util.Date validTo;

	/** 该组绑定的角色 id 列表；用户组只挂角色，不直接挂权限串 */
	private java.util.List<String> roleIds;

}
