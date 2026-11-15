package cn.surveyking.server.schema;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 启动时检查数据库结构，必要时自动迁移。
 *
 * <p>
 * 放在 {@link ApplicationRunner} 里（而不是 @PostConstruct）：此时数据源、连接池都已就绪，
 * 迁移失败会直接让 SpringApplication.run 抛异常 —— 进程退出、容器重启、编排健康检查失败，
 * 部署脚本据此自动回滚程序。<b>失败不吞</b>是有意的。
 * </p>
 */
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
