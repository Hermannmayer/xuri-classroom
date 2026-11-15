package cn.surveyking.server.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

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

	private SchemaSpec.VersionSpec version(String value, String... requires) {
		SchemaSpec.VersionSpec spec = new SchemaSpec.VersionSpec();
		spec.setVersion(value);
		spec.setRequires(Arrays.asList(requires));
		return spec;
	}

}
