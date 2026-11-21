package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;






@Data
@TableName(value = "t_repo_template", autoResultMap = true)
public class RepoTemplate implements Serializable {




	private String id;




	private String templateId;




	private String repoId;




	@TableField(fill = FieldFill.INSERT, select = false)
	private Date createAt;




	@TableField(fill = FieldFill.INSERT, select = false)
	private String createBy;

	private static final long serialVersionUID = 1L;

}