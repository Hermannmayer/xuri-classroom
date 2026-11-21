package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;












@Data
@TableName("t_repo_category")
public class RepoCategory {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;


	private String name;


	private String parentId;


	private String path;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

	@TableField(fill = FieldFill.INSERT)
	private String createBy;

}
