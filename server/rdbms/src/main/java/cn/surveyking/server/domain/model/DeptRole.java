package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户组 → 角色 绑定。
 *
 * <p>这是「组员继承角色的权限」的唯一来源：组不直接持有权限串，
 * 只持有角色；权限点仍然只挂在角色上（见 docs/permissions-ia.md）。
 */
@Data
@TableName(value = "t_dept_role", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class DeptRole extends BaseModel {

	private String deptId;

	private String roleId;

}
