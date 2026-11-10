package cn.surveyking.server.core.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * 单 jar 内嵌前端（Windows / Linux 直跑）时的 SPA 静态资源。
 *
 * <p>Docker 部署仍由 nginx 托管前端，不设置 SK_WEB_SPA_ENABLED，本配置不生效，
 * 行为与之前完全一致。
 */
@Configuration
@RestController
@ConditionalOnProperty(name = "sk.web.spa.enabled", havingValue = "true")
public class SpaWebConfig implements WebMvcConfigurer {

	private static final ClassPathResource INDEX = new ClassPathResource("static/index.html");

	/** 根路径不会进入 ResourceHttpRequestHandler，需要显式返回 index.html。 */
	@GetMapping("/")
	public ResponseEntity<Resource> index() {
		if (!INDEX.exists()) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(INDEX);
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler("/**").addResourceLocations("classpath:/static/").resourceChain(true)
				.addResolver(new PathResourceResolver() {
					@Override
					protected Resource getResource(String resourcePath, Resource location) throws IOException {
						// API / 验证码 / 附件仍由 Controller 处理；未命中的 API 不能回落 index.html，
						// 否则调用方会拿到 200 的 HTML，排查 404 时非常误导。
						if (resourcePath.startsWith("api/") || resourcePath.startsWith("captcha/")
								|| resourcePath.startsWith("files/")) {
							return null;
						}
						if (!StringUtils.hasText(resourcePath)) {
							return INDEX.exists() ? INDEX : null;
						}
						// 目录列表不支持；/assets/ 这类路径不能回落成 index.html。
						if (resourcePath.endsWith("/")) {
							return null;
						}
						Resource requested = location.createRelative(resourcePath);
						if (requested.exists() && requested.isReadable()) {
							return requested;
						}
						// 缺失的静态文件（带扩展名）返回 404，不要回落成 index.html。
						String fileName = resourcePath.substring(resourcePath.lastIndexOf('/') + 1);
						if (fileName.contains(".")) {
							return null;
						}
						return INDEX.exists() ? INDEX : null;
					}
				});
	}
}
