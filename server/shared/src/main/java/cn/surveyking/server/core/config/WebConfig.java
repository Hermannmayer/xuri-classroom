package cn.surveyking.server.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/8/11
 */
@Configuration
@RequiredArgsConstructor
@RestController
public class WebConfig implements WebMvcConfigurer {

	private final ObjectMapper objectMapper;

	@Override
	public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
		// 允许 controller 直接返回 string
		converters.add(0, new MappingJackson2HttpMessageConverter(objectMapper));
	}

	// 前端由独立的 nginx / vite 提供，jar 内不再包含 SPA 静态资源，
	// 因此这里不再注册 index.html 入口与 classpath:/static/ 资源映射。

}
