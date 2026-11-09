package cn.surveyking.server.core.security;

import cn.surveyking.server.core.common.ApiResponse;
import cn.surveyking.server.core.constant.ResponseCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 捕获 spring security 认证失败异常，返回 application/json 类型的数据
 *
 * @author javahuang
 * @date 2021/8/24
 */
@Component("restAuthenticationEntryPoint")
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

	private final ObjectMapper objectMapper;

	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException authenticationException) throws IOException, ServletException {

		response.setContentType("application/json;charset=UTF-8");
		ApiResponse<String> apiResponse = new ApiResponse(ResponseCode.UNAUTHORIZED.code,
				authenticationException.getMessage());

		// S3-7：未认证就是 401，不再伪装成 200。前端仍按 body.code 分支（json.code === 401
		// 触发跳登录），状态码只用于网关 / 冒烟 / 浏览器开发者工具识别。
		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.getOutputStream().println(objectMapper.writeValueAsString(apiResponse));
	}

}