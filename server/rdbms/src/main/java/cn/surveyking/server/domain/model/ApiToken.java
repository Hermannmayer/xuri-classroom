package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;















@Data
@TableName("t_api_token")
public class ApiToken {

	@TableId(type = IdType.ASSIGN_ID)
	private String id;


	private String userId;


	private String name;


	private String tokenHash;


	private String scopes;


	private Date expiresAt;


	private Date lastUsedAt;


	private Boolean revoked;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

}
