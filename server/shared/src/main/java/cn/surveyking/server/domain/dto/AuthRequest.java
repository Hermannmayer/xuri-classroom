package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.AppConsts;
import lombok.Data;

import jakarta.validation.constraints.NotNull;





@Data
public class AuthRequest {

	@NotNull
	private String username;

	@NotNull
	private String password;

	private String captchaVerification;




	private AppConsts.AUTH_TYPE authType = AppConsts.AUTH_TYPE.PWD;

}
