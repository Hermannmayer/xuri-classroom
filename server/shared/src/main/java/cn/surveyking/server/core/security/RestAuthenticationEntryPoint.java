package cn.surveyking.server.core.security;

import cn.surveyking.server.core.common.ApiResponse;
import cn.surveyking.server.core.constant.ResponseCode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;







@Component("restAuthenticationEntryPoint")
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

	private final ObjectMapper objectMapper;

	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException authenticationException) throws IOException, ServletException {

		response.setContentType("application/json;charset=UTF-8");
		ApiResponse<String> apiResponse = new ApiResponse(ResponseCode.UNAUTHORIZED.code,
				authenticationException.getMessage());



		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.getOutputStream().println(objectMapper.writeValueAsString(apiResponse));
	}

}