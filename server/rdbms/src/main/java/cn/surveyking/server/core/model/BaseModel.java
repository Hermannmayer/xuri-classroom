package cn.surveyking.server.core.model;

import cn.surveyking.server.core.constant.AppConsts;
import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.util.Date;







@Data
public class BaseModel {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

	@TableField(fill = FieldFill.INSERT)
	private String createBy;

	@TableField(fill = FieldFill.UPDATE)
	private Date updateAt;

	@TableField(fill = FieldFill.UPDATE)
	private String updateBy;




	@TableLogic
	@JsonIgnore
	@TableField(value = AppConsts.COLUMN_IS_DELETED, select = false)
	private Boolean deleted = false;

}
