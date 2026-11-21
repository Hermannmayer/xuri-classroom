package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;













@Data
@TableName("t_ai_usage")
public class AiUsage {


	public static final String STATUS_OK = "ok";


	public static final String STATUS_ERROR = "error";


	public static final String STATUS_REJECTED = "rejected";

	@TableId(type = IdType.ASSIGN_ID)
	private String id;


	private String userId;


	private String scene;


	private String model;

	private Integer promptTokens;

	private Integer completionTokens;

	private Integer totalTokens;


	private Long costMs;


	private String status;


	private String error;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

}
