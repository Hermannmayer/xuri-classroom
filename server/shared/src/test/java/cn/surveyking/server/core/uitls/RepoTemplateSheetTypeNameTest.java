package cn.surveyking.server.core.uitls;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * sheet 名是导入/导出之间的隐式契约：名字对不上，那一类题就静默消失。
 *
 * <p>
 * 线上服务端语言是英文，而 Excel 的 sheet 名不允许 {@code /}；英文名 {@code True / False}
 * 会被 fastexcel 静默改写成 {@code True - False}，导入按名字匹配不到 → 判断题整类丢失。
 * 所以这里钉住三件事：导出名与语言无关、合法、能被自己解析回来；历史坏名字也能兼容。
 */
class RepoTemplateSheetTypeNameTest {

	@Test
	@DisplayName("每种题型的导出名都不含 Excel 非法字符，且能被 fromName 解析回自己")
	void exportNamesAreLegalAndReversible() {
		for (RepoTemplateI18n.SheetType type : RepoTemplateI18n.SheetType.values()) {
			String name = type.exportName();
			assertNotNull(name);
			for (char illegal : new char[] { '\\', '/', '?', '*', '[', ']', ':' }) {
				assertTrue(name.indexOf(illegal) < 0, type + " 的导出名含非法字符 " + illegal + "：" + name);
			}
			assertEquals(type, RepoTemplateI18n.SheetType.fromName(name), "导出名必须能被导入识别：" + name);
		}
	}

	@Test
	@DisplayName("历史导出的 True - False（Excel 把 / 换成 -）仍能识别为判断题")
	void legacyDashNameStillMatches() {
		assertEquals(RepoTemplateI18n.SheetType.TRUE_FALSE, RepoTemplateI18n.SheetType.fromName("True - False"));
		assertEquals(RepoTemplateI18n.SheetType.TRUE_FALSE, RepoTemplateI18n.SheetType.fromName("判断题"));
		assertNull(RepoTemplateI18n.SheetType.fromName("不存在的表"));
	}
}