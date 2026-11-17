package cn.surveyking.server.schema;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import tools.jackson.databind.ObjectMapper;

/**
 * 结构探测与版本匹配的纯逻辑测试（不连数据库）。
 */
class SchemaUpgradeServiceTest {

	private SchemaUpgradeService newService() {
		return new SchemaUpgradeService(null, new ObjectMapper());
	}

	@Test
	void comparesSemanticVersions() {
		assertEquals(0, SchemaUpgradeService.compare("2.1.0", "2.1.0"));
		assertEquals(1, SchemaUpgradeService.compare("2.1.0", "2.0.0"));
		assertEquals(-1, SchemaUpgradeService.compare("2.0.0", "2.1.0"));
		assertEquals(1, SchemaUpgradeService.compare("v2.10.0", "2.9.9"));
		assertEquals(0, SchemaUpgradeService.compare("2.1", "2.1.0"));
	}

	@Test
	void detectsHighestMatchingVersion() {
		SchemaSpec spec = new SchemaSpec();
		spec.setVersions(Arrays.asList(version("2.0.0"), version("2.1.0", "column:t_template.chapter")));

		Set<String> withColumn = new HashSet<>(Arrays.asList("table:t_user", "column:t_template.chapter"));
		assertEquals("2.1.0", newService().detectVersion(spec, withColumn));

		Set<String> withoutColumn = new HashSet<>(Collections.singletonList("table:t_user"));
		assertEquals("2.0.0", newService().detectVersion(spec, withoutColumn));
	}

	@Test
	void baselineMissingIsRejected() {
		SchemaSpec spec = new SchemaSpec();
		spec.getBaseline().setRequires(Arrays.asList("table:t_user", "table:t_role"));
		SchemaUpgradeException error = assertThrows(SchemaUpgradeException.class,
				() -> newService().assertBaseline(spec, new HashSet<>(Collections.singletonList("table:t_user"))));
		assertEquals(true, error.getMessage().contains("table:t_role"));
	}

	@Test
	void ignoresCaseWhenMatching() {
		SchemaSpec spec = new SchemaSpec();
		spec.setVersions(Arrays.asList(version("2.0.0"), version("2.1.0", "column:t_template.chapter")));
		Set<String> upper = new HashSet<>(Collections.singletonList("COLUMN:T_TEMPLATE.CHAPTER"));
		assertEquals("2.1.0", newService().detectVersion(spec, upper));
	}

	/**
	 * 复现 2026-11-17 的事故：加了 V2.2.1 迁移脚本却忘了改 VERSION（程序还是 2.2.0），
	 * 数据库也停在 2.2.0。此时 pendingScripts 会把这批脚本静默丢弃、缺少列，
	 * 而实体已经带新字段 → MyBatis SELECT 报 Unknown column → 答卷相关接口 500。
	 * 现在必须**拒绝启动**，让部署脚本的「等健康」立刻失败。
	 */
	@Test
	void rejectsMigrationScriptsNewerThanBothAppAndDatabase() {
		SchemaUpgradeService service = newService();
		SchemaUpgradeException error = assertThrows(SchemaUpgradeException.class,
				() -> service.assertNoFutureScripts("2.2.0", "2.2.0"));
		assertEquals(true, error.getMessage().contains("VERSION"));
	}

	/**
	 * 回滚场景不能拦：库结构已经是 2.2.1，程序退回 2.2.0。
	 * 迁移只加不删，旧程序读新结构是安全的；拦了回滚就起不来。
	 */
	@Test
	void allowsRollbackWhenDatabaseIsAlreadyNewer() {
		SchemaUpgradeService service = newService();
		String latest = latestScriptVersion();
		assertDoesNotThrow(() -> service.assertNoFutureScripts("2.0.0", latest));
	}

	/** 版本对齐（正常发版）时不该报错。 */
	@Test
	void allowsWhenAppVersionCoversAllScripts() {
		SchemaUpgradeService service = newService();
		String latest = latestScriptVersion();
		assertDoesNotThrow(() -> service.assertNoFutureScripts(latest, latest));
	}

	/**
	 * 取 db/migration 下最高的脚本版本。
	 *
	 * <p>
	 * 原来这里写死 2.2.1，每加一个迁移就得回来改一次测试——不改就红，而且是「看起来像功能坏了」
	 * 的假红。改成从 classpath 现算，测试的语义回到它真正想验证的东西：
	 * 「程序版本覆盖得住全部脚本时不许拦；覆盖不住时必须拦」。
	 */
	private static String latestScriptVersion() {
		try {
			Resource[] resources = new PathMatchingResourcePatternResolver()
					.getResources("classpath*:db/migration/V*.sql");
			String latest = "0.0.0";
			for (Resource resource : resources) {
				String name = resource.getFilename();
				if (name == null) {
					continue;
				}
				String version = name.substring(1, name.indexOf("__"));
				if (SchemaUpgradeService.compare(version, latest) > 0) {
					latest = version;
				}
			}
			return latest;
		}
		catch (Exception e) {
			throw new IllegalStateException("读取迁移脚本版本失败", e);
		}
	}

	private SchemaSpec.VersionSpec version(String value, String... requires) {
		SchemaSpec.VersionSpec spec = new SchemaSpec.VersionSpec();
		spec.setVersion(value);
		spec.setRequires(Arrays.asList(requires));
		return spec;
	}

}
