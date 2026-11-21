package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;







@Data
@TableName(value = "t_dept_role", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class DeptRole extends BaseModel {

	private String deptId;

	private String roleId;

}
