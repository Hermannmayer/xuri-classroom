package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.EqualsAndHashCode;







@Data
@TableName(value = "t_user_position", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class UserPosition extends BaseModel {

	private String userId;

	private String deptId;

	private String positionId;




	private Boolean isPrimaryPosition;

	@JsonIgnore
	@TableField(exist = false)
	private boolean deleted = false;

}
