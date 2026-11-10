package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName(value = "t_repo_partner")
@Data
@EqualsAndHashCode(callSuper = false)
public class RepoPartner extends BaseModel {

	@TableField(value = "repo_id")
	private String repoId;

	@TableField(value = "user_id")
	private String userId;

	private String deptId;

	/** 授权级别：1 只读 / 2 可编辑（含只读，默认）/ 3 可授权（含编辑） */
	@TableField(value = "access_level")
	private Integer accessLevel;

	@TableField(exist = false)
	private static final long serialVersionUID = 1L;

	@TableField(exist = false)
	private Boolean deleted = false;

}
