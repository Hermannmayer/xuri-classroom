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

	@Test
	void parsesNewTypeMarkers() {
		String text = "新题型说明\n\n"
				+ "【下拉题】请选择一个部门\n部门A\n部门B（正确答案）\n\n"
				+ "【评分题】本次培训的满意度\n分数：8\n\n"
				+ "【NPS题】你愿意推荐给同事吗\n\n"
				+ "【矩阵单选题】请评价下列服务\n行：响应速度\n行：专业程度\n列：满意\n列：一般\n答案：A|B\n\n"
				+ "【矩阵多选题】请勾选符合的项\n行：甲部门\n行：乙部门\n列：准时\n列：完整\n答案：A,B|B\n\n"
				+ "【矩阵填空题】请填写联系方式\n行：张三\n行：李四\n列：姓名\n列：电话\n答案：张三|李四\n\n"
				+ "【上传题】请上传一份作业照片\n分数：5\n答案：示例：身份证正面照";

		ImportPreview preview = parse(text);

		assertEquals(7, preview.getFlat().size());

		SurveySchema select = question(preview, "请选择一个部门");
		assertEquals(SurveySchema.QuestionType.Select, select.getType());
		assertEquals(2, select.getChildren().size());
		assertEquals(2, select.getDataSource().size());
		assertEquals(SurveySchema.ExamScoreMode.onlyOne, select.getAttribute().getExamAnswerMode());
		assertEquals(Collections.singletonList("部门B"), correctOptions(select));

		SurveySchema score = question(preview, "本次培训的满意度");
		assertEquals(SurveySchema.QuestionType.Score, score.getType());
		assertEquals("[0,8]", score.getAttribute().getScope());
		assertEquals(8D, score.getAttribute().getExamScore(), 0.001);
		assertTrue(score.getChildren().isEmpty());

		SurveySchema nps = question(preview, "推荐给同事");
		assertEquals(SurveySchema.QuestionType.Nps, nps.getType());
		assertEquals(Integer.valueOf(0), nps.getAttribute().getNpsStartNum());
		assertEquals(Integer.valueOf(11), nps.getAttribute().getNpsTotalNum());
		assertEquals(1, nps.getChildren().size());

		SurveySchema matrixRadio = question(preview, "请评价下列服务");
		assertEquals(SurveySchema.QuestionType.MatrixRadio, matrixRadio.getType());
		assertEquals(2, matrixRadio.getRow().size());
		assertEquals("响应速度", matrixRadio.getRow().get(0).getTitle());
		assertEquals(2, matrixRadio.getDataSource().size());
		assertEquals("满意", matrixRadio.getDataSource().get(0).getLabel());
		assertEquals(2, matrixRadio.getChildren().size());
		assertEquals("A|B", matrixRadio.getAttribute().getExamCorrectAnswer());

		SurveySchema matrixCheckbox = question(preview, "请勾选符合的项");
		assertEquals(SurveySchema.QuestionType.MatrixCheckbox, matrixCheckbox.getType());
		assertEquals("A,B|B", matrixCheckbox.getAttribute().getExamCorrectAnswer());

		SurveySchema matrixFillBlank = question(preview, "请填写联系方式");
		assertEquals(SurveySchema.QuestionType.MatrixFillBlank, matrixFillBlank.getType());
		assertEquals("张三|李四", matrixFillBlank.getAttribute().getExamCorrectAnswer());

		SurveySchema upload = question(preview, "请上传一份作业照片");
		assertEquals(SurveySchema.QuestionType.Upload, upload.getType());
		assertEquals(Integer.valueOf(1), upload.getAttribute().getMaxFileCount());
		assertEquals(5D, upload.getAttribute().getMaxFileSize(), 0.001);
		assertEquals(1, upload.getChildren().size());
		assertEquals("示例：身份证正面照", upload.getChildren().get(0).getAttribute().getExamCorrectAnswer());
	}

	@Test
	void warnsMatrixWithoutRowOrColumn() {
		ImportPreview preview = parse("【矩阵单选题】没有写行列\nA. 甲（正确答案）\nB. 乙");

		assertTrue(preview.getFlat().isEmpty());
		assertTrue(preview.getWarnings().stream().anyMatch(item -> "MATRIX_TITLES_MISSING".equals(item.getCode())));
	}

	@Test
	void warnsWhenRankMarkerIsUsed() {
		// 排序题不是本系统的题型：标了也不造类型，按内容推断并提示
		ImportPreview preview = parse("【排序题】请排序\nA. 甲\nB. 乙\n答案：B");

		assertTrue(preview.getWarnings().stream().anyMatch(item -> "TYPE_UNKNOWN".equals(item.getCode())));
		assertEquals(SurveySchema.QuestionType.Radio, preview.getFlat().get(0).getType());
	}

}

