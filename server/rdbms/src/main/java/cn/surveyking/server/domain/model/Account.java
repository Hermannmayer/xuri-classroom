package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;





@Data
@TableName(value = "t_account", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Account extends BaseModel {


	private String userId;


	private String userType;


	private String authType;


	private String authAccount;


	private String authSecret;


	private String secretSalt;


	private Integer status;

}
