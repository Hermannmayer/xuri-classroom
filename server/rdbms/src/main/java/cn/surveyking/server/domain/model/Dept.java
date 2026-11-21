package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;










@Data
@TableName(value = "t_dept", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Dept extends BaseModel {


	public static final String TYPE_ORG = "org";


	public static final String TYPE_CLASS = "class";


	public static final String CLASS_KIND_GROUP = "group";


	public static final String CLASS_KIND_TEACHING = "teaching";

	private String parentId;


	private String deptType;


	private Boolean allowRegister;


	private String classKind;

	private String name;

	private String shortName;

	private String code;


	private String managerId;

	private Integer sortCode;


	private String propertyJson;

	private String status;

	private String remark;





	private java.util.Date validFrom;




	private java.util.Date validTo;

}
