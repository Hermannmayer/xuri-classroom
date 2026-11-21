package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;









@TableName(value = "t_class_partner")
@Data
@EqualsAndHashCode(callSuper = false)
public class ClassPartner extends BaseModel {

	private String deptId;

	private String userId;


	private Integer accessLevel;

}
