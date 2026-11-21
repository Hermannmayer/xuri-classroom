package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;











@Data
@TableName(value = "t_user_dept", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class UserDept extends BaseModel {

	private String userId;

	private String deptId;

}
