package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 组织机构
 *
 * @author javahuang
 * @date 2021/11/2
 */
@Data
@TableName(value = "t_dept", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Dept extends BaseModel {

	private String parentId;

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
	 * 组级权限模式：INHERIT、APPEND、OVERRIDE。
	 * @deprecated 已下线：权限点只挂角色，组通过 t_dept_role 授权（见 docs/permissions-ia.md）。
	 * 字段保留仅为兼容旧库与旧客户端，不再参与任何权限计算，确认无人写入后可删除。
	 */
	@Deprecated
	private String authorityMode;

	/**
	 * 组级权限串，逗号分隔。
	 * @deprecated 已下线：同上，改用 t_dept_role。保留字段仅避免数据库迁移风险。
	 */
	@Deprecated
	private String authority;

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
