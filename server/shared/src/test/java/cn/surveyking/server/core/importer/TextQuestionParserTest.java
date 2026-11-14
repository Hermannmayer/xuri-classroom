package cn.surveyking.server.core.importer;

import cn.surveyking.server.domain.dto.SurveySchema;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TextQuestionParserTest {

	private ImportPreview parse(String text) {
		return new TextQuestionParser(text).parse();
	}

	private SurveySchema question(ImportPreview preview, String keyword) {
		return preview.getFlat().stream().filter(item -> item.getTitle().contains(keyword)).findFirst()
				.orElseThrow(() -> new AssertionError("找不到题目：" + keyword));
	}

	private List<String> correctOptions(SurveySchema question) {
		return question.getChildren().stream()
				.filter(child -> child.getAttribute() != null && child.getAttribute().getExamCorrectAnswer() != null)
				.map(SurveySchema::getTitle).collect(Collectors.toList());
	}

	@Test
	void parsesExamTextWithAllTypes() {
		String text = "办公安全知识考试\n请认真阅读题目后作答。【欢迎语】\n\n"
				+ "离开工位时，应如何保护电脑中的信息？（10分）【单选题】\n直接离开\n锁定电脑屏幕（正确答案）\n关闭显示器即可\n答案解析：锁定屏幕可以防止他人未经授权访问电脑。\n\n"
				+ "下列哪些属于强密码特征？（5分）【多选题】\nA. 长度超过 12 位（正确答案）\nB. 包含大小写与数字（正确答案）\nC. 使用生日\n\n"
				+ "可以对同事公开自己的密码。（5分）【判断题】\n正确\n错误（正确答案）\n\n"
				+ "公司的英文缩写是______。（5分）【填空题】\n答案：XURI&旭日\n\n"
				+ "简述离职时账号交接的步骤。【简答题】\n参考答案：先冻结账号，再移交资料。";

		ImportPreview preview = parse(text);

		assertEquals("办公安全知识考试", preview.getTitle());
		assertEquals("请认真阅读题目后作答。", preview.getDescription());
		assertEquals(5, preview.getFlat().size());
		assertEquals(30D, preview.getStats().getScore(), 0.001);
		assertEquals(Integer.valueOf(1), preview.getStats().getByType().get("Radio"));
		assertEquals(Integer.valueOf(1), preview.getStats().getByType().get("Checkbox"));
		assertEquals(Integer.valueOf(1), preview.getStats().getByType().get("Judge"));
		assertEquals(Integer.valueOf(1), preview.getStats().getByType().get("FillBlank"));
		assertEquals(Integer.valueOf(1), preview.getStats().getByType().get("Textarea"));

		SurveySchema radio = question(preview, "离开工位");
		assertEquals(SurveySchema.QuestionType.Radio, radio.getType());
		assertEquals(10D, radio.getAttribute().getExamScore(), 0.001);
		assertEquals("锁定屏幕可以防止他人未经授权访问电脑。", radio.getAttribute().getExamAnalysis());
		assertEquals(3, radio.getChildren().size());
		assertEquals(3, radio.getDataSource().size());
		assertEquals(Collections.singletonList("锁定电脑屏幕"), correctOptions(radio));
		assertNotNull(radio.getChildren().get(1).getAttribute().getExamCorrectAnswer());

		SurveySchema checkbox = question(preview, "强密码");
		assertEquals(SurveySchema.QuestionType.Checkbox, checkbox.getType());
		assertEquals(2, correctOptions(checkbox).size());

		SurveySchema judge = question(preview, "公开自己的密码");
		assertEquals(SurveySchema.QuestionType.Judge, judge.getType());
		assertEquals(Collections.singletonList("错误"), correctOptions(judge));

		SurveySchema fill = question(preview, "英文缩写");
		assertEquals(SurveySchema.QuestionType.FillBlank, fill.getType());
		assertEquals("XURI\n旭日", fill.getChildren().get(0).getAttribute().getExamCorrectAnswer());

		SurveySchema textarea = question(preview, "离职");
		assertEquals(SurveySchema.QuestionType.Textarea, textarea.getType());
		assertEquals(SurveySchema.ExamScoreMode.manual, textarea.getAttribute().getExamAnswerMode());
	}

	@Test
	void keepsTitleNullWhenTextStartsWithQuestion() {
		String text = "1. 这是什么？（5分）【单选题】\nA. 甲（正确答案）\nB. 乙";

		ImportPreview preview = parse(text);

		assertNull(preview.getTitle());
		assertEquals(1, preview.getFlat().size());
		assertEquals("这是什么？", preview.getFlat().get(0).getTitle());
		assertEquals(Collections.singletonList("甲"), correctOptions(preview.getFlat().get(0)));
	}

	@Test
	void splitsQuestionsWithoutBlankLines() {
		String text = "【单选题】题干一？（5分）\nA. 甲（正确答案）\nB. 乙\n【判断题】题干二。\n正确\n错误（正确答案）";

		ImportPreview preview = parse(text);

		assertEquals(2, preview.getFlat().size());
		assertEquals(SurveySchema.QuestionType.Radio, preview.getFlat().get(0).getType());
		assertEquals(SurveySchema.QuestionType.Judge, preview.getFlat().get(1).getType());
	}

	@Test
	void warnsWhenAnswerMissing() {
		String text = "没有答案的题？【单选题】\nA. 甲\nB. 乙";

		ImportPreview preview = parse(text);

		assertEquals(1, preview.getFlat().size());
		assertTrue(preview.getWarnings().stream().anyMatch(item -> "ANSWER_MISSING".equals(item.getCode())));
	}

	@Test
	void supportsMultipleBlanks() {
		String text = "请填写：____ 和 ____ 。【多项填空】\n答案：甲|乙";

		ImportPreview preview = parse(text);

		SurveySchema multiple = preview.getFlat().get(0);
		assertEquals(SurveySchema.QuestionType.MultipleBlank, multiple.getType());
		assertEquals(2, multiple.getChildren().size());
		assertEquals("甲", multiple.getChildren().get(0).getAttribute().getExamCorrectAnswer());
		assertEquals("乙", multiple.getChildren().get(1).getAttribute().getExamCorrectAnswer());
	}

	@Test
	void infersTypeWhenMarkerMissing() {
		String text = "判断题没有标记。\n正确\n错误（正确答案）\n\n没有标记的填空题：______。\n答案：42";

		ImportPreview preview = parse(text);

		assertEquals(SurveySchema.QuestionType.Judge, preview.getFlat().get(0).getType());
		assertEquals(SurveySchema.QuestionType.FillBlank, preview.getFlat().get(1).getType());
	}

	@Test
	void handlesCrlf() {
		String text = "标题\r\n\r\n第一题？【单选题】\r\nA. 甲（正确答案）\r\nB. 乙";

		ImportPreview preview = parse(text);

		assertEquals("标题", preview.getTitle());
		assertEquals(1, preview.getFlat().size());
	}

}
