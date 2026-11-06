package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 用户 → 用户组 的「附加组」绑定。
 *
 * <p>
 * 主组仍然写在 <code>t_user.dept_id</code>（大量数据可见性 SQL 依赖它，不能动），
 * 本表只存附加组；<b>用户最终所属组 = 主组 ∪ 附加组</b>。
 * 权限解析与组有效期校验会遍历这两部分（各自沿祖先链取并集）。
 *
 * @author perm-matrix
 */
@Data
@TableName(value = "t_user_dept", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class UserDept extends BaseModel {

	private String userId;

	private String deptId;

}
