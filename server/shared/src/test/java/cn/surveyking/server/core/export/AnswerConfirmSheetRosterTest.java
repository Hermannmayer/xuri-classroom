package cn.surveyking.server.core.export;

import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Tag;

/**
 * 成绩确认单「名册版」：整班一张表、每人一行、签名列留空手写。
 *
 * <p>
 * 这里盯的是三件会直接被老师看见的事：**页数**（30 人必须翻页且第二页有表头）、
 * **表头**（签名列的表头在，说明这一列没漏画）、**版面方向**（跨班必须横向，
 * 否则多出来的「班级」列会把签名格子挤到写不下字）。
 *
 * <p>
 * 用真渲染 + PDFTextStripper 抽文本，不是替身：字体子集/列宽/翻页这些只有真跑才知道。
 */
@Tag("slow")
class AnswerConfirmSheetRosterTest {

	@Test
	@DisplayName("1 人：一页、有表头、有姓名和签名列")
	void singleRowFitsOnePage() throws Exception {
		byte[] pdf = AnswerConfirmSheetExporter.renderRoster(project(), rows(1, "保育员1班"), "保育员1班", null);
		String text = text(pdf, 1);

		assertEquals(1, pageCount(pdf));
		assertTrue(text.contains("成绩确认单"), text);
		assertTrue(text.contains("序号"), text);
		assertTrue(text.contains("考生签名"), text);
		assertTrue(text.contains("张三1"), text);
	}

	@Test
	@DisplayName("30 人：翻页 + 每页重复表头（第二页仍能看到「考生签名」）")
	void thirtyRowsPaginateAndRepeatHeader() throws Exception {
		byte[] pdf = AnswerConfirmSheetExporter.renderRoster(project(), rows(30, "保育员1班"), "保育员1班", null);

		assertEquals(2, pageCount(pdf), "30 人应该正好两页（每页最多 24 行）");
		String first = text(pdf, 1);
		String second = text(pdf, 2);
		// 第 1 页满 24 行，第 25 人落在第 2 页
		assertTrue(first.contains("张三24"), "第 1 页应有前 24 人");
		assertTrue(second.contains("张三25"), "第 2 页应从第 25 人开始");
		assertTrue(second.contains("考生签名"), "翻页后必须重画表头");
		assertTrue(second.contains("（续）"), "续页要有「（续）」标识");
	}

	@Test
	@DisplayName("跨班：横向 A4 + 多出「班级」列")
	void crossClassUsesLandscapeWithClassColumn() throws Exception {
		List<AnswerConfirmSheetExporter.Entry> rows = new ArrayList<>();
		rows.add(entry("张三", "保育员1班", 88d));
		rows.add(entry("李四", "保育员2班", 55d));

		byte[] pdf = AnswerConfirmSheetExporter.renderRoster(project(), rows, null, null);

		try (PDDocument document = Loader.loadPDF(pdf)) {
			PDPage page = document.getPage(0);
			assertTrue(page.getMediaBox().getWidth() > page.getMediaBox().getHeight(),
					"跨班必须横向：" + page.getMediaBox().getWidth() + " x " + page.getMediaBox().getHeight());
		}
		String text = text(pdf, 1);
		assertTrue(text.contains("班级"), "跨班要有班级列：" + text);
		assertTrue(text.contains("保育员2班"), text);
		assertTrue(text.contains("考生签名"), text);
	}

	@Test
	@DisplayName("空列表：中文报错，不生成只有表头的空表")
	void emptyRowsRejected() {
		InternalServerError error = assertThrows(InternalServerError.class,
				() -> AnswerConfirmSheetExporter.renderRoster(project(), new ArrayList<>(), "保育员1班", null));
		assertTrue(error.getMessage().contains("没有可生成确认单的答卷"), error.getMessage());
	}

	/* ====== 辅助 ====== */

	private static List<AnswerConfirmSheetExporter.Entry> rows(int count, String className) {
		List<AnswerConfirmSheetExporter.Entry> rows = new ArrayList<>();
		for (int i = 1; i <= count; i++) {
			// 一半及格一半不及格：两种颜色都要走到
			rows.add(entry("张三" + i, className, i % 2 == 0 ? 88d : 42d));
		}
		return rows;
	}

	private static AnswerConfirmSheetExporter.Entry entry(String name, String className, double total) {
		return new AnswerConfirmSheetExporter.Entry().name(name).className(className).totalScore(Double.valueOf(total))
				.objectiveScore(20d).subjectiveScore(total - 20d).passed(total >= 60d).maxScore(Double.valueOf(100d));
	}

	private static ProjectView project() {
		ProjectView project = new ProjectView();
		project.setId("p1");
		project.setName("保育员中级理论考试");
		project.setSurvey(SurveySchema.builder().title("保育员中级理论考试").attribute(new SurveySchema.Attribute())
				.build());
		return project;
	}

	private static int pageCount(byte[] pdf) throws Exception {
		try (PDDocument document = Loader.loadPDF(pdf)) {
			return document.getNumberOfPages();
		}
	}

	private static String text(byte[] pdf, int page) throws Exception {
		try (PDDocument document = Loader.loadPDF(pdf)) {
			PDFTextStripper stripper = new PDFTextStripper();
			stripper.setStartPage(page);
			stripper.setEndPage(page);
			return stripper.getText(document);
		}
	}

}
