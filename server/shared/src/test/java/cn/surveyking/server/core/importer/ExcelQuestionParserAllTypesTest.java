package cn.surveyking.server.core.importer;

import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.SurveySchema;
import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 全题型 Excel 导入：13 个 sheet（原 5 个 + 新增 8 个）、矩阵两层结构、JSON 兜底列、内嵌图片按行归属。
 */
class ExcelQuestionParserAllTypesTest {

	private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

	@Test
	void parsesAllThirteenSheetTypes() throws Exception {
		ImportPreview preview = new ExcelQuestionParser(buildWorkbook()).parse();

		assertEquals(13, preview.getFlat().size());
		assertEquals(13, preview.getStats().getTotal());
		assertTrue(preview.getWarnings().stream().noneMatch(item -> "ADVANCED_JSON_INVALID".equals(item.getCode())));

		// 原五种不变
		SurveySchema radio = byTitle(preview, "单选：图片题");
		assertEquals(SurveySchema.QuestionType.Radio, radio.getType());
		assertEquals(3, radio.getChildren().size());
		assertEquals("乙", correctOptions(radio).get(0));
		assertEquals(SurveySchema.ExamScoreMode.onlyOne, radio.getAttribute().getExamAnswerMode());

		SurveySchema checkbox = byTitle(preview, "多选：都选");
		assertEquals(2, correctOptions(checkbox).size());

		assertEquals(SurveySchema.QuestionType.Judge, byTitle(preview, "判断：水是湿的").getType());
		assertEquals(SurveySchema.QuestionType.MultipleBlank, byTitle(preview, "填空：").getType());

		// 下拉题：选项 + 只判一个 + 答案落到选项 id 上
		SurveySchema select = byTitle(preview, "下拉：选一个");
		assertEquals(SurveySchema.QuestionType.Select, select.getType());
		assertEquals(3, select.getDataSource().size());
		assertEquals(SurveySchema.ExamScoreMode.onlyOne, select.getAttribute().getExamAnswerMode());
		assertEquals("丙", correctOptions(select).get(0));

		// 评分题：分数列 → 满星
		SurveySchema score = byTitle(preview, "评分：满意度");
		assertEquals(SurveySchema.QuestionType.Score, score.getType());
		assertEquals("[0,8]", score.getAttribute().getScope());
		assertEquals(8D, score.getAttribute().getExamScore(), 0.001);

		// NPS：分数列 → 最高分（10 → 0~10 共 11 档）
		SurveySchema nps = byTitle(preview, "NPS：推荐吗");
		assertEquals(SurveySchema.QuestionType.Nps, nps.getType());
		assertEquals(Integer.valueOf(0), nps.getAttribute().getNpsStartNum());
		assertEquals(Integer.valueOf(11), nps.getAttribute().getNpsTotalNum());

		// 级联：选项树 JSON → dataSource 树，答案取末级 value
		SurveySchema cascader = byTitle(preview, "级联：你在哪");
		assertEquals(SurveySchema.QuestionType.Cascader, cascader.getType());
		assertEquals(2, cascader.getDataSource().size());
		assertEquals(1, cascader.getDataSource().get(0).getChildren().size());
		assertEquals("济南", cascader.getDataSource().get(0).getChildren().get(0).getLabel());
		assertEquals("jn", cascader.getAttribute().getExamCorrectAnswer());
		assertEquals(Integer.valueOf(2), cascader.getAttribute().getCascaderLevel());

		// 矩阵四类：行 row、列 dataSource + children、答案按行保留
		SurveySchema matrixRadio = byTitle(preview, "矩阵单选：评价");
		assertEquals(SurveySchema.QuestionType.MatrixRadio, matrixRadio.getType());
		assertEquals(2, matrixRadio.getRow().size());
		assertEquals("甲", matrixRadio.getRow().get(0).getTitle());
		assertEquals(2, matrixRadio.getDataSource().size());
		assertEquals(2, matrixRadio.getChildren().size());
		assertEquals("满意", matrixRadio.getDataSource().get(0).getLabel());
		assertEquals(matrixRadio.getDataSource().get(0).getValue(), matrixRadio.getChildren().get(0).getId());
		assertEquals("A|B", matrixRadio.getAttribute().getExamCorrectAnswer());

		SurveySchema matrixCheckbox = byTitle(preview, "矩阵多选：评价");
		assertEquals(SurveySchema.QuestionType.MatrixCheckbox, matrixCheckbox.getType());
		assertEquals("A,B|B", matrixCheckbox.getAttribute().getExamCorrectAnswer());

		// 上传题：属性按前端 Upload 组件的字段（maxFileCount/maxFileSize），答案列当参考答案
		SurveySchema upload = byTitle(preview, "上传：交作业");
		assertEquals(SurveySchema.QuestionType.Upload, upload.getType());
		assertEquals(Integer.valueOf(1), upload.getAttribute().getMaxFileCount());
		assertEquals(5D, upload.getAttribute().getMaxFileSize(), 0.001);
		assertEquals(SurveySchema.ExamScoreMode.none, upload.getAttribute().getExamAnswerMode());
		assertEquals("身份证正面照", upload.getAttribute().getExamCorrectAnswer());
		assertEquals(1, upload.getChildren().size());

		SurveySchema matrixFillBlank = byTitle(preview, "矩阵填空：");
		assertEquals(SurveySchema.QuestionType.MatrixFillBlank, matrixFillBlank.getType());
		assertEquals("张三|李四", matrixFillBlank.getAttribute().getExamCorrectAnswer());

		// JSON 兜底列：title / attribute / tags 都能覆盖
		SurveySchema merged = byTitle(preview, "简答题（JSON 覆盖）");
		assertEquals(SurveySchema.QuestionType.Textarea, merged.getType());
		assertEquals("请简述", merged.getAttribute().getPlaceholder());
		assertEquals(List.of("覆盖"), merged.getTags());

		// 内嵌图片：按锚点行归属到单选题，token 追加到题干末尾
		assertTrue(radio.getTitle().contains("[[IMG:1]]"), "题干应带图片 token：" + radio.getTitle());
		assertEquals(1, preview.getAttachments().size());
		assertTrue(preview.getWarnings().stream().anyMatch(item -> "IMAGE_IMPORTED".equals(item.getCode())));
	}

	@Test
	void keepsRowWhenAdvancedJsonIsBroken() throws Exception {
		ImportPreview preview = new ExcelQuestionParser(badJsonWorkbook()).parse();

		assertEquals(1, preview.getFlat().size());
		assertEquals(SurveySchema.QuestionType.Textarea, preview.getFlat().get(0).getType());
		ImportPreview.Warning warning = preview.getWarnings().stream()
				.filter(item -> "ADVANCED_JSON_INVALID".equals(item.getCode())).findFirst()
				.orElseThrow(() -> new AssertionError("缺高级配置 JSON 错误提示"));
		assertTrue(warning.getMessage().contains("简答题"), warning.getMessage());
		assertTrue(warning.getMessage().contains("第 2 行"), warning.getMessage());
	}

	@Test
	void advancedJsonCanReplaceTypeAndChildren() throws Exception {
		try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			sheet(workbook, "简答题", new String[] { "序号", "题干", "答案", "高级配置(JSON)" },
					new String[] { "1", "简答：改成矩阵", "",
							"{\"type\":\"MatrixRadio\",\"row\":[{\"id\":\"r1\",\"title\":\"甲\"}],\"dataSource\":[{\"label\":\"满意\",\"value\":\"c1\"}],"
									+ "\"children\":[{\"id\":\"c1\",\"title\":\"满意\",\"type\":\"Option\",\"attribute\":{}}]}" });
			workbook.write(out);
			ImportPreview preview = new ExcelQuestionParser(new MockMultipartFile("file", "json-children.xlsx", XLSX,
					out.toByteArray())).parse();

			SurveySchema question = preview.getFlat().get(0);
			assertEquals(SurveySchema.QuestionType.MatrixRadio, question.getType());
			assertEquals(1, question.getRow().size());
			assertEquals("甲", question.getRow().get(0).getTitle());
			assertEquals(1, question.getDataSource().size());
			assertEquals(1, question.getChildren().size());
			assertEquals("c1", question.getChildren().get(0).getId());
			assertEquals(Integer.valueOf(1), preview.getStats().getByType().get("MatrixRadio"));
		}
	}

	@Test
	void rejectsLegacyXls() {
		MultipartFile file = new MockMultipartFile("file", "题库.xls", "application/vnd.ms-excel",
				"not-a-zip".getBytes(StandardCharsets.UTF_8));
		ErrorCodeException error = assertThrows(ErrorCodeException.class, () -> new ExcelQuestionParser(file).parse());
		assertTrue(error.getMessage().contains(".xlsx"), error.getMessage());
	}

	// ------ 造 xlsx

	private MultipartFile buildWorkbook() throws Exception {
		try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			sheet(workbook, "单选题", new String[] { "序号", "题干", "选项A", "选项B", "选项C", "答案", "分数" },
					new String[] { "1", "单选：图片题", "甲", "乙", "丙", "B", "2" });
			sheet(workbook, "多选题", new String[] { "序号", "题干", "选项A", "选项B", "选项C", "答案", "分数" },
					new String[] { "2", "多选：都选", "甲", "乙", "丙", "AC", "3" });
			sheet(workbook, "判断题", new String[] { "序号", "题干", "选项A", "选项B", "答案", "分数" },
					new String[] { "3", "判断：水是湿的", "正确", "错误", "A", "1" });
			sheet(workbook, "填空题", new String[] { "序号", "题干", "空1", "空2", "单空分数" },
					new String[] { "4", "填空：____ 和 ____", "甲", "乙", "2" });
			sheet(workbook, "简答题", new String[] { "序号", "题干", "答案", "高级配置(JSON)" }, new String[] { "5",
					"简答：写点什么", "先冻结账号", "{\"title\":\"简答题（JSON 覆盖）\",\"attribute\":{\"placeholder\":\"请简述\"},\"tags\":[\"覆盖\"]}" });
			sheet(workbook, "下拉题", new String[] { "序号", "题干", "选项A", "选项B", "选项C", "答案", "分数" },
					new String[] { "6", "下拉：选一个", "甲", "乙", "丙", "C", "2" });
			sheet(workbook, "评分题", new String[] { "序号", "题干", "分数" }, new String[] { "7", "评分：满意度", "8" });
			sheet(workbook, "NPS题", new String[] { "序号", "题干", "分数" }, new String[] { "8", "NPS：推荐吗", "10" });
			sheet(workbook, "级联题", new String[] { "序号", "题干", "选项树(JSON)", "答案", "分数" },
					new String[] { "9", "级联：你在哪",
							"[{\"label\":\"山东\",\"value\":\"sd\",\"children\":[{\"label\":\"济南\",\"value\":\"jn\"}]},{\"label\":\"江苏\",\"value\":\"js\"}]",
							"sd/jn", "2" });
			sheet(workbook, "矩阵单选题", new String[] { "序号", "题干", "行标题1", "行标题2", "列标题1", "列标题2", "答案" },
					new String[] { "10", "矩阵单选：评价", "甲", "乙", "满意", "不满意", "A|B" });
			sheet(workbook, "矩阵多选题", new String[] { "序号", "题干", "行标题1", "行标题2", "列标题1", "列标题2", "答案" },
					new String[] { "11", "矩阵多选：评价", "甲", "乙", "满意", "一般", "A,B|B" });
			sheet(workbook, "上传题", new String[] { "序号", "题干", "分数", "答案" },
					new String[] { "12", "上传：交作业", "5", "身份证正面照" });
			sheet(workbook, "矩阵填空题", new String[] { "序号", "题干", "行标题1", "行标题2", "列标题1", "列标题2", "答案" },
					new String[] { "13", "矩阵填空：姓名电话", "张三", "李四", "姓名", "电话", "张三|李四" });

			// 一张小图贴在「单选题」的数据行（0 基第 1 行 = 1 基第 2 行）
			XSSFSheet pictureSheet = workbook.getSheet("单选题");
			int pictureIndex = workbook.addPicture(dotPng(), Workbook.PICTURE_TYPE_PNG);
			CreationHelper helper = workbook.getCreationHelper();
			XSSFDrawing drawing = pictureSheet.createDrawingPatriarch();
			ClientAnchor anchor = helper.createClientAnchor();
			anchor.setRow1(1);
			anchor.setCol1(5);
			anchor.setRow2(2);
			anchor.setCol2(6);
			drawing.createPicture(anchor, pictureIndex);

			workbook.write(out);
			return new MockMultipartFile("file", "all-types.xlsx", XLSX, out.toByteArray());
		}
	}

	private MultipartFile badJsonWorkbook() throws Exception {
		try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			sheet(workbook, "简答题", new String[] { "序号", "题干", "答案", "高级配置(JSON)" },
					new String[] { "1", "简答：坏 JSON", "答案", "{不是 JSON}" });
			workbook.write(out);
			return new MockMultipartFile("file", "bad-json.xlsx", XLSX, out.toByteArray());
		}
	}

	private void sheet(XSSFWorkbook workbook, String name, String[] headers, String[] values) {
		XSSFSheet sheet = workbook.createSheet(name);
		Row headerRow = sheet.createRow(0);
		for (int i = 0; i < headers.length; i++) {
			headerRow.createCell(i).setCellValue(headers[i]);
		}
		Row dataRow = sheet.createRow(1);
		for (int i = 0; i < values.length; i++) {
			if (values[i] != null) {
				dataRow.createCell(i).setCellValue(values[i]);
			}
		}
	}

	private byte[] dotPng() throws Exception {
		try (InputStream in = new ClassPathResource("import/dot.png").getInputStream()) {
			return in.readAllBytes();
		}
	}

	private SurveySchema byTitle(ImportPreview preview, String keyword) {
		return preview.getFlat().stream().filter(item -> item.getTitle().contains(keyword)).findFirst()
				.orElseThrow(() -> new AssertionError("找不到题目：" + keyword));
	}

	private List<String> correctOptions(SurveySchema question) {
		return question.getChildren().stream()
				.filter(child -> child.getAttribute() != null && child.getAttribute().getExamCorrectAnswer() != null)
				.map(SurveySchema::getTitle).collect(Collectors.toList());
	}

}
