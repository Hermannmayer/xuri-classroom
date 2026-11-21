package cn.surveyking.server;

import cn.surveyking.server.core.uitls.DatabaseInitHelper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties

@EnableScheduling
public class SurveyServerApplication {

	public static void main(String[] args) {

		if (args.length > 0) {
			DatabaseInitHelper.init(args);
		}

		SpringApplication.run(SurveyServerApplication.class, args);
	}

}