package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;












@Data
@TableName("t_api_idempotency")
public class ApiIdempotency {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;

	private String userId;


	private String keyValue;


	private String resultJson;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

}
