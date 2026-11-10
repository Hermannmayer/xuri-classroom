package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 组织机构（t_dept 一棵树，靠 dept_type 分成两类节点）。
 *
 * <p>{@link #TYPE_ORG} 用户组：教职工的组织单位，可以绑定角色、放 staff；
 * {@link #TYPE_CLASS} 班级：学员的教学单位，不绑角色、只放 student。
 *
 * @author javahuang
 * @date 2021/11/2
 */
@Data
@TableName(value = "t_dept", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Dept extends BaseModel {

	/** 用户组：教职工的组织单位，可绑定角色，可放 staff */
	public static final String TYPE_ORG = "org";

	/** 班级：学员的教学单位，不绑角色，只放 student */
	public static final String TYPE_CLASS = "class";

	private String parentId;

	/** org=用户组(教职工) class=班级(学员)；历史数据为空时按 org 处理 */
	private String deptType;

	private String name;

	private String shortName;

	private String code;

	/** 负责人id */
	private String managerId;

	private Integer sortCode;

	/** 拓展属性 */
	private String propertyJson;

	private String status;

	private String remark;

	/**
	 * 有效期开始（含）。为空表示不限制开始时间。
	 * 组员只有在 [validFrom, validTo] 内才允许登录并作答/看课。
	 */
	private java.util.Date validFrom;

	/**
	 * 有效期结束（含）。为空表示**永久有效**。
	 */
	private java.util.Date validTo;

}
