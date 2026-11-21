package cn.surveyking.server.schema;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;










@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class SchemaUpgradeRunner implements ApplicationRunner {

	private final SchemaUpgradeService schemaUpgradeService;

	@Override
	public void run(ApplicationArguments args) {
		SchemaUpgradeResult result = schemaUpgradeService.ensureUpToDate();
		log.info("[schema] 检查结果：status={}，程序={}，数据库={}", result.getStatus(), result.getAppVersion(),
				result.getDbVersion());
		if (result.getMessage() != null) {
			log.info("[schema] {}", result.getMessage());
		}
	}

}
