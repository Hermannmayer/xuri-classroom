package cn.surveyking.server.ai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * AI 调用用的 WebClient（16MB 缓冲，够放长上下文 JSON）。
 *
 * <p>
 * 不再注入 {@code WebClient.Builder}：Spring Boot 4 把 WebClient 的自动配置拆到了独立模块，
 * 只带 spring-boot-starter-webflux 已经拿不到那个 Builder Bean，应用会在启动期直接失败
 * （{@code Parameter 0 of method webClient ... required a bean of type WebClient$Builder}）。
 * 这里本来也只改一个 maxInMemorySize，直接用静态 builder 等价且少一层依赖。
 */
@Configuration
public class AiConfiguration {

	@Bean
	public WebClient webClient() {
		return WebClient.builder()
				.codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
				.build();
	}

}
