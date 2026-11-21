package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;







@Data
@TableName(value = "t_position", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Position extends BaseModel {

	private String name;

	private String code;


	private Boolean isVirtual = false;


	private String dataPermissionType;


	private String propertyJson;

}
