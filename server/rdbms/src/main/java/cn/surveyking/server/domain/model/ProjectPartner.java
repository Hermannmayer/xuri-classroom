package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;






@TableName(value = "t_project_partner")
@Data
@EqualsAndHashCode(callSuper = false)
public class ProjectPartner extends BaseModel {




	@TableField(value = "project_id")
	private String projectId;




	@TableField(value = "type")
	private Integer type;




	@TableField(value = "status")
	private Integer status;




	@TableField(value = "user_id")
	private String userId;




	@TableField(value = "user_name")
	private String userName;




	@TableField(value = "group_id")
	private String groupId;




	@TableField(value = "data_permission")
	private String dataPermission;






	@TableField(value = "access_level")
	private Integer accessLevel;

	@TableField(exist = false)
	private static final long serialVersionUID = 1L;

	@TableField(exist = false)
	private Boolean deleted = false;

}