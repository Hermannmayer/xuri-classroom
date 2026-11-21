package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Date;





@Data
@TableName(value = "t_role", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Role extends BaseModel {

	private String name;

	private String code;

	private String remark;


	private String authority;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;




	private Integer status;

}
