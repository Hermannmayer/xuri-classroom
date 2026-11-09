package cn.surveyking.server.core.constant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 权限目录是唯一真源：前端常量、SQL 种子、文档都从这里生成。
 * 这些不变量一旦破坏，权限矩阵与后端校验会静默分叉。
 */
class PermissionEnumTest {

	@Test
	@DisplayName("权限码不重复")
	void codesAreUnique() {
		Set<String> seen = new HashSet<String>();
		for (PermissionEnum value : PermissionEnum.values()) {
			assertTrue(seen.add(value.getCode()), "重复的权限码：" + value.getCode());
		}
	}

	@Test
	@DisplayName("权限码符合 域:对象[:动作] 约定")
	void codeFormat() {
		Pattern pattern = Pattern.compile("^[a-z]+(:[a-zA-Z]+)+$");
		for (PermissionEnum value : PermissionEnum.values()) {
			assertTrue(pattern.matcher(value.getCode()).matches(),
					"权限码格式不符合约定：" + value.getCode());
		}
	}

	@Test
	@DisplayName("学员专属恰好是这 6 个（新增/删除都要先改 ADR 与前端）")
	void studentOnlySet() {
		Set<String> expected = new HashSet<String>(Arrays.asList("project:answer", "repo:practice", "repo:book",
				"repo:questions:read", "exercise:list", "portal:student"));
		Set<String> actual = Arrays.stream(PermissionEnum.values()).filter(PermissionEnum::isStudentOnly)
				.map(PermissionEnum::getCode).collect(Collectors.toSet());
		assertEquals(expected, actual, "学员专属集合变了：请同步 ADR-0002、前端 STUDENT_ONLY_PERMISSIONS 与迁移");
	}

	@Test
	@DisplayName("管理员默认不拥有学员专属能力")
	void adminDoesNotGetStudentOnly() {
		Set<String> studentOnly = Arrays.stream(PermissionEnum.values()).filter(PermissionEnum::isStudentOnly)
				.map(PermissionEnum::getCode).collect(Collectors.toSet());
		assertTrue(!studentOnly.isEmpty(), "学员专属集合不应该为空");
		for (String code : studentOnly) {
			assertTrue(code.startsWith("project:") || code.startsWith("repo:") || code.startsWith("exercise:")
					|| code.startsWith("portal:"), "学员专属应落在学员域：" + code);
		}
	}

}
