package cn.surveyking.server.core.export;

import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.SurveySchema.QuestionType;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Tag;

/**
 * 成绩确认单的「真渲染」冒烟。
 *
 * <p>
 * 这张纸的硬指标是「恰好一页」：老师打印一摞发下去签字，一旦溢出到第二页，
 * 就会出现「第二页没签字」的扯皮。所以这里不看版式细节，只死盯三件事：
 * 产出是合法 PDF、页数是 1、长考试名/未批改这种真实数据不会把版面顶破。
 *
 * <p>
 * 用真实的 {@link AnswerConfirmSheetExporter}（含字体嵌入与缺字清洗），不是替身：
 * 中文能不能编码、U+2014（总分缺失时的破折号）会不会抛 "No glyph"，只有真渲染才知道。
 */
@Tag("slow")
class AnswerConfirmSheetRenderingTest {

	@Test
	@DisplayName("正常卷：一页 A4，字体/破折号都能编码")
	void rendersSinglePage() throws Exception {
		byte[] pdf = AnswerConfirmSheetExporter.renderConfirmSheet(project("保育员中级理论考试"), answer("graded"),
				"保育员1班", new AnswerConfirmSheetExporter.ConfirmOptions().attemptNo(Integer.valueOf(1)));

		assertTrue(pdf.length > 3_000, "确认单太小，可能没画出内容：" + pdf.length + " 字节");
		assertEquals("%PDF-", new String(pdf, 0, 5, java.nio.charset.StandardCharsets.ISO_8859_1));
		assertEquals(1, pageCount(pdf), "成绩确认单必须恰好一页");
	}

	@Test
	@DisplayName("长考试名 + 人工题未批改：仍然一页（换行与提示文字不能把签字栏顶到第二页）")
	void longTitleAndPendingManualStaysOnOnePage() throws Exception {
		String longTitle = "2026 年秋季保育员（中级）职业技能等级认定理论考试（第一批次·补考）";
		byte[] pdf = AnswerConfirmSheetExporter.renderConfirmSheet(project(longTitle), answer("pending"), "保育员1班",
				null);

		assertEquals(1, pageCount(pdf), "长标题或未批改提示把确认单挤成了两页");
	}

	@Test
	@DisplayName("没有分数/没有 examInfo 也不炸：总分画「—」，小计按 0")
	void rendersWithoutScore() throws Exception {
		AnswerView view = new AnswerView();
		view.setAnswererName("李四");
		view.setCreateAt(new Date(1_760_000_000_000L));
		view.setGradeStatus("none");

		byte[] pdf = AnswerConfirmSheetExporter.renderConfirmSheet(project("日常考核"), view, null, null);

		assertEquals(1, pageCount(pdf), "缺分数时也要是一页");
	}

	/* ====== 及格线：默认按卷面满分 60%，不是写死 60 ====== */

	@Test
	@DisplayName("默认及格线 = 满分×60%：满分 120 → 72 分，单子上写明算式")
	void defaultPassLineFollowsMaxScore() throws Exception {
		byte[] pdf = AnswerConfirmSheetExporter.renderConfirmSheet(project("满分 120 的卷子", 80d, 40d), answer("graded"),
				"保育员1班", null);

		String text = text(pdf, 1);
		assertTrue(text.contains("及格线 72 分（满分 120 的 60%）"), "默认及格线没跟着满分走：" + text);
	}

	@Test
	@DisplayName("取不到卷面满分（题目都没配分值）时回退 60 分，不写算式")
	void passLineFallsBackToSixty() throws Exception {
		byte[] pdf = AnswerConfirmSheetExporter.renderConfirmSheet(project("没有分值的卷子", null, null), answer("graded"),
				null, null);

		String text = text(pdf, 1);
		assertTrue(text.contains("及格线 60 分"), "满分未知时应回退 60 分：" + text);
		assertFalse(text.contains("的 60%）"), "满分未知时不该编一个算式出来：" + text);
	}

	@Test
	@DisplayName("显式 passScore 优先：传 90 就是 90，不再套 60%")
	void explicitPassScoreWins() throws Exception {
		byte[] pdf = AnswerConfirmSheetExporter.renderConfirmSheet(project("满分 120 的卷子", 80d, 40d), answer("graded"),
				"保育员1班", new AnswerConfirmSheetExporter.ConfirmOptions().passScore(Double.valueOf(90d)));

		String text = text(pdf, 1);
		assertTrue(text.contains("及格线 90 分"), "显式及格线被覆盖了：" + text);
		assertFalse(text.contains("的 60%）"), "显式及格线不该再套比例说明：" + text);
	}

	@Test
	@DisplayName("及格线算法：120→72、未知→60、显式 90→90、满分 50→30、非整数满分保留 1 位小数")
	void resolvePassScore() {
		assertEquals(72d, AnswerConfirmSheetExporter.resolvePassScore(null, Double.valueOf(120d)), 1e-9d);
		assertEquals(60d, AnswerConfirmSheetExporter.resolvePassScore(null, null), 1e-9d);
		// 满分 0 / 负数当作「取不到」，不能算出 0 分及格这种荒唐结果
		assertEquals(60d, AnswerConfirmSheetExporter.resolvePassScore(null, Double.valueOf(0d)), 1e-9d);
		assertEquals(60d, AnswerConfirmSheetExporter.resolvePassScore(null, Double.valueOf(-10d)), 1e-9d);
		assertEquals(90d, AnswerConfirmSheetExporter.resolvePassScore(Double.valueOf(90d), Double.valueOf(120d)), 1e-9d);
		assertEquals(30d, AnswerConfirmSheetExporter.resolvePassScore(null, Double.valueOf(50d)), 1e-9d);
		assertEquals(72.3d, AnswerConfirmSheetExporter.resolvePassScore(null, Double.valueOf(120.5d)), 1e-9d);
	}

	@Test
	@DisplayName("isPassed 跟着满分走：满分 120 时 72 分及格、71.9 不及格；没有满分仍是 60")
	void isPassedFollowsMaxScore() {
		assertTrue(AnswerConfirmSheetExporter.isPassed(Double.valueOf(72d), null, Double.valueOf(120d)));
		assertFalse(AnswerConfirmSheetExporter.isPassed(Double.valueOf(71.9d), null, Double.valueOf(120d)));
		assertTrue(AnswerConfirmSheetExporter.isPassed(Double.valueOf(60d), null));
		// 选项里自带 maxScore 时同样生效（导出任务只拿得到 options 的场景）
		assertFalse(AnswerConfirmSheetExporter.isPassed(Double.valueOf(70d),
				new AnswerConfirmSheetExporter.ConfirmOptions().maxScore(Double.valueOf(120d))));
		// 总分缺失一律 false（渲染层据此显示「未评分」，不显示「不及格」）
		assertFalse(AnswerConfirmSheetExporter.isPassed(null, null, Double.valueOf(120d)));
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

	/** 一张卷：两道计分题（客观 20 分 + 人工 30 分） */
	private static ProjectView project(String title) {
		return project(title, Double.valueOf(20), Double.valueOf(30));
	}

	/**
	 * 一张卷：两道题的分值由调用方给（null 表示这题没配分值，用来造「取不到卷面满分」的场景）。
	 */
	private static ProjectView project(String title, Double firstScore, Double secondScore) {
		SurveySchema radio = SurveySchema.builder().id("q1").title("保育员上岗前应做的第一件事是？")
				.type(QuestionType.Radio)
				.attribute(attribute(firstScore, SurveySchema.ExamScoreMode.onlyOne))
				.children(options()).build();
		SurveySchema textarea = SurveySchema.builder().id("q2").title("请简述幼儿午睡期间的安全巡查要点。")
				.type(QuestionType.Textarea)
				.attribute(attribute(secondScore, SurveySchema.ExamScoreMode.manual))
				.build();
		List<SurveySchema> children = new ArrayList<>();
		children.add(radio);
		children.add(textarea);
		SurveySchema survey = SurveySchema.builder().title(title).attribute(new SurveySchema.Attribute())
				.children(children).build();

		ProjectView project = new ProjectView();
		project.setId("p1");
		project.setName(title);
		project.setSurvey(survey);
		return project;
	}

	private static SurveySchema.Attribute attribute(Double score, SurveySchema.ExamScoreMode mode) {
		SurveySchema.Attribute attribute = new SurveySchema.Attribute();
		attribute.setExamScore(score);
		attribute.setExamAnswerMode(mode);
		return attribute;
	}

	private static List<SurveySchema> options() {
		List<SurveySchema> options = new ArrayList<>();
		options.add(SurveySchema.builder().id("o1").title("开窗通风").type(QuestionType.Option).build());
		options.add(SurveySchema.builder().id("o2").title("清点人数").type(QuestionType.Option).build());
		return options;
	}

	private static AnswerView answer(String gradeStatus) {
		AnswerView view = new AnswerView();
		view.setId("a1");
		view.setAnswererName("张三");
		view.setCreateBy("u1");
		view.setCreateAt(new Date(1_760_000_000_000L));
		view.setGradeStatus(gradeStatus);
		view.setExamScore(Double.valueOf(42.5d));
		LinkedHashMap<String, Double> scores = new LinkedHashMap<>();
		scores.put("q1", Double.valueOf(20d));
		scores.put("q2", Double.valueOf(22.5d));
		AnswerExamInfo examInfo = new AnswerExamInfo();
		examInfo.setQuestionScore(scores);
		view.setExamInfo(examInfo);
		return view;
	}

}
