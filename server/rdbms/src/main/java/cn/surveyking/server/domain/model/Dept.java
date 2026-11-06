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
	 * 有效期开始（含）。为空表示不限制开始时间。
	 * 组员只有在 [validFrom, validTo] 内才允许登录并作答/看课。
	 */
	private java.util.Date validFrom;

	/**
	 * 有效期结束（含）。为空表示**永久有效**。
	 */
	private java.util.Date validTo;

}
