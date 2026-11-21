package cn.surveyking.server.ai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;










@Configuration
public class AiConfiguration {

	@Bean
	public WebClient webClient() {
		return WebClient.builder()
				.codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
				.build();
	}

}
