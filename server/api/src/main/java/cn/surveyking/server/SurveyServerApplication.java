package cn.surveyking.server;

import cn.surveyking.server.core.uitls.DatabaseInitHelper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties
// 匿名答卷每日清理（AnonymousCleanupService 的 @Scheduled）需要开启调度
@EnableScheduling
public class SurveyServerApplication {

	public static void main(String[] args) {
		// 快速执行数据库初始化操作
		if (args.length > 0) {
			DatabaseInitHelper.init(args);
		}

		SpringApplication.run(SurveyServerApplication.class, args);
	}

}