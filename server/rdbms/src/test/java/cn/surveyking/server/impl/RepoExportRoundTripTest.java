package cn.surveyking.server.impl;

import cn.surveyking.server.core.uitls.RepoTemplateExcelParseHelper;
import cn.surveyking.server.core.uitls.RepoTemplateI18n;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateRequest;
import cn.surveyking.server.domain.model.Template;
import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * 题库导出闭环：导入 → 导出 → 再导入。
 *
 * <p>
 * 这条测试守的是老师最常见的用法「导出 → 在 Excel 里改 → 再导入」：导出只要少写一类题型，
 * 那一类题就会在往返里静默消失。所以这里不看「导出的文件长什么样」，而是把导出的字节原样喂回
 * {@link RepoTemplateExcelParseHelper}，逐题型比对数量、选项、答案、矩阵行列。
 *
 * <p>
 * 断言口径说明：填空题 sheet 里同时有两种题型——一个空的是 {@code FillBlank}、多个空的是
 * {@code MultipleBlank}，导入是按「空」的个数还原的。所以这里断言的是「空的个数与答案」，
 * 而不是逐题锁死 enum 名：跟着空的个数变名是格式本身的语义，不是丢数据。
 */
class RepoExportRoundTripTest {

	private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

	/** 随产品发布的模板（存在时再跑，见 {@link #roundTripsShippedTemplate()}） */
	private static final Path TEMPLATE_DIR = Paths.get("..", "api", "src", "main", "resources", "template")
			.toAbsolutePath().normalize();

	@Test
	void roundTripsAllThirteenTypes() throws Exception {
		byte[] exported = RepoQuestionExcelExporter.export(toTemplates(parseFixture(sourceWorkbook())));

		// 一、一种题型一个 sheet，顺序与导入模板一致；空题型不建 sheet（这里 13 种都有题）
		assertEquals(Arrays.stream(RepoTemplateI18n.SheetType.values()).map(RepoTemplateI18n.SheetType::displayName)
				.collect(Collectors.toList()), sheetNames(exported));

		// 二、每个表头都必须是导入认的列名：写错一个表头，那一列就会被静默忽略（等于又丢一次数据）
		for (String sheetName : sheetNames(exported)) {
			for (String header : headerOf(exported, sheetName)) {
				assertTrue(isImportableHeader(header), "工作表「" + sheetName + "」的表头导入侧不认：" + header);
			}
		}

		// 三、公共列 + 该题型自己的列 + 高级配置(JSON)
		assertEquals(Arrays.asList(RepoTemplateI18n.HeaderLabel.SERIAL_NO.displayLabel(),
				RepoTemplateI18n.HeaderLabel.CHAPTER.displayLabel(), RepoTemplateI18n.HeaderLabel.TITLE.displayLabel(),
				RepoTemplateI18n.HeaderLabel.SCORE.displayLabel(),
				RepoTemplateI18n.HeaderLabel.DIFFICULTY.displayLabel(),
				RepoTemplateI18n.HeaderLabel.TAGS.displayLabel(), RepoTemplateI18n.HeaderLabel.ANALYSIS.displayLabel(),
				RepoTemplateI18n.HeaderLabel.ANSWER.displayLabel(), RepoTemplateI18n.optionLabel("A"),
				RepoTemplateI18n.optionLabel("B"), RepoTemplateI18n.optionLabel("C"), RepoTemplateI18n.optionLabel("D"),
				RepoTemplateI18n.optionLabel("E"), RepoTemplateI18n.optionLabel("F"), RepoTemplateI18n.optionLabel("G"),
				RepoTemplateI18n.optionLabel("H"), RepoTemplateI18n.advancedJsonLabel() + "(JSON)"),
				headerOf(exported, RepoTemplateI18n.SheetType.SINGLE_CHOICE.displayName()));
		assertEquals(29, headerOf(exported, RepoTemplateI18n.SheetType.MATRIX_RADIO.displayName()).size(),
				"矩阵题：8 个公共列 + 行标题10 + 列标题10 + 高级配置");

		// 四、把导出的字节原样再导入一遍
		List<TemplateRequest> reparsed = parse(exported);
		assertEquals(13, reparsed.size(), "导出 → 再导入后题目数应仍是 13：" + titles(reparsed));
		assertEquals(13, reparsed.stream().map(TemplateRequest::getQuestionType).distinct().count(),
				"13 道题应覆盖 13 种题型：" + reparsed.stream().map(TemplateRequest::getQuestionType)
						.collect(Collectors.toList()));

		// 单选：选项顺序、答案落在正确选项上、公共列都在
		SurveySchema radio = questionOf(reparsed, "单选：四大名著");
		assertEquals(SurveySchema.QuestionType.Radio, radio.getType());
		assertEquals(Arrays.asList("东游记", "西游记", "南游记", "北游记"), optionTitles(radio));
		assertEquals(List.of("西游记"), correctOptions(radio));
		assertEquals(SurveySchema.ExamScoreMode.onlyOne, radio.getAttribute().getExamAnswerMode());
		assertEquals(2D, radio.getAttribute().getExamScore(), 0.001);
		assertEquals("第一章 基础", radio.getChapter());
		assertEquals("易", radio.getDifficulty());
		assertEquals("解析文字", radio.getAttribute().getExamAnalysis());
		assertEquals(Arrays.asList("简单", "语文"), radio.getTags());

		// 多选：三个正确答案一个不少
		SurveySchema checkbox = questionOf(reparsed, "多选：四大名著");
		assertEquals(SurveySchema.QuestionType.Checkbox, checkbox.getType());
		assertEquals(Arrays.asList("西游记", "水浒传", "三国演义"), correctOptions(checkbox));

		// 判断：A/B 的语义不能反过来
		SurveySchema judge = questionOf(reparsed, "判断：");
		assertEquals(SurveySchema.QuestionType.Judge, judge.getType());
		assertEquals(Arrays.asList("正确", "错误"), optionTitles(judge));
		assertEquals(List.of("正确"), correctOptions(judge));

		// 填空：4 个空逐个对上（多空填空题在库里的类型是 MultipleBlank）
		SurveySchema fillBlank = questionOf(reparsed, "填空：四大名著是");
		assertEquals(SurveySchema.QuestionType.MultipleBlank, fillBlank.getType());
		assertEquals(4, fillBlank.getChildren().size());
		assertEquals(Arrays.asList("西游记", "水浒传", "三国演义", "红楼梦"), blankAnswers(fillBlank));

		// 简答：答案在第一个子节点上
		SurveySchema textarea = questionOf(reparsed, "简答：");
		assertEquals(SurveySchema.QuestionType.Textarea, textarea.getType());
		assertEquals("安全第一", textarea.getChildren().get(0).getAttribute().getExamCorrectAnswer());

		// 下拉：选项 + 只判一个 + 答案落到选项 id 上
		SurveySchema select = questionOf(reparsed, "下拉：");
		assertEquals(SurveySchema.QuestionType.Select, select.getType());
		assertEquals(3, select.getDataSource().size());
		assertEquals(List.of("广州"), correctOptions(select));

		// 评分：分数列 = 满星，8 星不能被读成默认 5 星
		SurveySchema score = questionOf(reparsed, "评分：");
		assertEquals(SurveySchema.QuestionType.Score, score.getType());
		assertEquals("[0,8]", score.getAttribute().getScope());
		assertEquals(8D, score.getAttribute().getExamScore(), 0.001);

		// NPS：最高分 10 → 0~10 共 11 档
		SurveySchema nps = questionOf(reparsed, "NPS：");
		assertEquals(SurveySchema.QuestionType.Nps, nps.getType());
		assertEquals(Integer.valueOf(0), nps.getAttribute().getNpsStartNum());
		assertEquals(Integer.valueOf(11), nps.getAttribute().getNpsTotalNum());

		// 级联：选项树两层结构 + 答案只存末级 value
		SurveySchema cascader = questionOf(reparsed, "级联：");
		assertEquals(SurveySchema.QuestionType.Cascader, cascader.getType());
		assertEquals(2, cascader.getDataSource().size());
		assertEquals(1, cascader.getDataSource().get(0).getChildren().size());
		assertEquals("济南", cascader.getDataSource().get(0).getChildren().get(0).getLabel());
		assertEquals("jn", cascader.getAttribute().getExamCorrectAnswer());
		assertEquals(Integer.valueOf(2), cascader.getAttribute().getCascaderLevel());

		// 矩阵单选：行在 row、列在 dataSource 且与 children 一一对应、答案按行原样保留
		SurveySchema matrixRadio = questionOf(reparsed, "矩阵单选：");
		assertEquals(SurveySchema.QuestionType.MatrixRadio, matrixRadio.getType());
		assertEquals(Arrays.asList("响应速度", "专业程度"), rowTitles(matrixRadio));
		assertEquals(Arrays.asList("满意", "一般"), columnTitles(matrixRadio));
		assertEquals(matrixRadio.getDataSource().get(0).getValue(), matrixRadio.getChildren().get(0).getId());
		assertEquals("A|B", matrixRadio.getAttribute().getExamCorrectAnswer());

		// 矩阵多选：行内多选用逗号
		SurveySchema matrixCheckbox = questionOf(reparsed, "矩阵多选：");
		assertEquals(SurveySchema.QuestionType.MatrixCheckbox, matrixCheckbox.getType());
		assertEquals("A,B|B", matrixCheckbox.getAttribute().getExamCorrectAnswer());

		// 矩阵填空：行标题是填的人，列标题是填的字段
		SurveySchema matrixFillBlank = questionOf(reparsed, "矩阵填空：请填写");
		assertEquals(SurveySchema.QuestionType.MatrixFillBlank, matrixFillBlank.getType());
		assertEquals(Arrays.asList("张三", "李四"), rowTitles(matrixFillBlank));
		assertEquals(Arrays.asList("姓名", "电话"), columnTitles(matrixFillBlank));
		assertEquals("张三|李四", matrixFillBlank.getAttribute().getExamCorrectAnswer());

		// 上传题：属性按前端 Upload 组件的字段，答案列当「参考答案/示例说明」
		SurveySchema upload = questionOf(reparsed, "上传：");
		assertEquals(SurveySchema.QuestionType.Upload, upload.getType());
		assertEquals(Integer.valueOf(1), upload.getAttribute().getMaxFileCount());
		assertEquals(SurveySchema.ExamScoreMode.none, upload.getAttribute().getExamAnswerMode());
		assertEquals("身份证正面照", upload.getAttribute().getExamCorrectAnswer());
		assertEquals(1, upload.getChildren().size());
	}

	@Test
	void roundTripsShippedTemplate() throws Exception {
		Path file = TEMPLATE_DIR.resolve("旭日云课堂题库导入模板.xlsx");
		assumeTrue(Files.exists(file), "跳过：没有发布模板 " + file);

		List<TemplateRequest> source = parse(Files.readAllBytes(file));
		assertEquals(13, source.size(), "模板应有 13 道示例题");

		byte[] exported = RepoQuestionExcelExporter.export(toTemplates(source));
		List<TemplateRequest> reparsed = parse(exported);

		assertEquals(13, reparsed.size(), "导出 → 再导入后题目数应仍是 13：" + titles(reparsed));
		assertEquals(source.stream().map(this::titleOf).collect(Collectors.toList()),
				reparsed.stream().map(this::titleOf).collect(Collectors.toList()), "逐题顺序与题干都要对上");
		assertEquals(source.stream().map(TemplateRequest::getQuestionType).collect(Collectors.toList()),
				reparsed.stream().map(TemplateRequest::getQuestionType).collect(Collectors.toList()),
				"模板里 13 道题的题型在往返后应一一对应");

		// 模板里的级联答案写成整条路径 sd/jn，往返后前端只认末级 jn
		SurveySchema cascader = questionOf(reparsed, "你所在的城市");
		assertEquals(2, cascader.getDataSource().size());
		assertEquals("jn", cascader.getAttribute().getExamCorrectAnswer());

		SurveySchema matrix = questionOf(reparsed, "请评价下列服务");
		assertEquals(2, matrix.getRow().size());
		assertEquals(2, matrix.getDataSource().size());
		assertEquals("A|B", matrix.getAttribute().getExamCorrectAnswer());

		SurveySchema upload = questionOf(reparsed, "请上传一份作业照片");
		assertEquals("示例：身份证正面照", upload.getAttribute().getExamCorrectAnswer());
	}

	@Test
	void fillBlankSheetKeepsSingleAndMultiBlank() throws Exception {
		List<Template> templates = toTemplates(parseFixture(fillBlankWorkbook()));
		// 题库行上的 tag 列优先于 schema.tags：这里只给 tag，导出就该用 tag 写「标签」列
		templates.get(0).setTag(new String[] { "已归档", "计算" });

		List<TemplateRequest> reparsed = parse(RepoQuestionExcelExporter.export(templates));

		assertEquals(2, reparsed.size(), "填空题 sheet 里单空与多空都要在：" + titles(reparsed));
		SurveySchema singleBlank = questionOf(reparsed, "古诗作者的朝代是");
		assertEquals(SurveySchema.QuestionType.FillBlank, singleBlank.getType());
		assertEquals(List.of("唐"), blankAnswers(singleBlank));
		assertEquals(Arrays.asList("已归档", "计算"), singleBlank.getTags());

		SurveySchema multiBlank = questionOf(reparsed, "三个代表重要思想的三大");
		assertEquals(SurveySchema.QuestionType.MultipleBlank, multiBlank.getType());
		assertEquals(Arrays.asList("甲", "乙", "丙"), blankAnswers(multiBlank));
	}

	// ------ 造 xlsx（用产品同款 fastexcel，不额外引 POI）

	private byte[] sourceWorkbook() throws Exception {
		try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			Workbook workbook = new Workbook(out, "题库", "1.0");
			sheet(workbook, "单选题", OPTION_HEADERS,
					cells("序号", "1", "章节", "第一章 基础", "题干", "单选：四大名著", "分数", "2", "难度", "易", "标签",
							"简单,语文", "解析", "解析文字", "答案", "B", "选项A", "东游记", "选项B", "西游记", "选项C",
							"南游记", "选项D", "北游记"));
			sheet(workbook, "多选题", OPTION_HEADERS,
					cells("序号", "2", "章节", "第一章 基础", "题干", "多选：四大名著", "分数", "2.5", "难度", "中", "答案", "ABC",
							"选项A", "西游记", "选项B", "水浒传", "选项C", "三国演义", "选项D", "红楼梦"));
			sheet(workbook, "判断题", OPTION_HEADERS, cells("序号", "3", "题干", "判断：西游记是名著", "分数", "1", "答案", "A",
					"选项A", "正确", "选项B", "错误"));
			sheet(workbook, "填空题", BLANK_HEADERS, cells("序号", "4", "题干", "填空：四大名著是____", "分数", "2.5", "空1", "西游记",
					"空2", "水浒传", "空3", "三国演义", "空4", "红楼梦"));
			sheet(workbook, "简答题", SIMPLE_HEADERS, cells("序号", "5", "题干", "简答：安全生产第一原则", "分数", "10", "难度", "难",
					"答案", "安全第一"));
			sheet(workbook, "下拉题", OPTION_HEADERS, cells("序号", "6", "题干", "下拉：下列哪个是首都", "分数", "2", "答案", "C",
					"选项A", "上海", "选项B", "北京", "选项C", "广州"));
			sheet(workbook, "评分题", SIMPLE_HEADERS, cells("序号", "7", "题干", "评分：给本次培训打分", "分数", "8"));
			sheet(workbook, "NPS题", SIMPLE_HEADERS, cells("序号", "8", "题干", "NPS：愿意推荐给同事吗", "分数", "10"));
			sheet(workbook, "级联题", CASCADER_HEADERS,
					cells("序号", "9", "题干", "级联：你在哪个城市", "分数", "2", "答案", "sd/jn", "选项树(JSON)",
							"[{\"label\":\"山东\",\"value\":\"sd\",\"children\":[{\"label\":\"济南\",\"value\":\"jn\"}]},{\"label\":\"江苏\",\"value\":\"js\"}]"));
			sheet(workbook, "矩阵单选题", matrixHeaders(),
					cells("序号", "10", "题干", "矩阵单选：请评价下列服务", "分数", "5", "答案", "A|B", "行标题1", "响应速度",
							"行标题2", "专业程度", "列标题1", "满意", "列标题2", "一般"));
			sheet(workbook, "矩阵多选题", matrixHeaders(),
					cells("序号", "11", "题干", "矩阵多选：请勾选符合的项", "分数", "5", "答案", "A,B|B", "行标题1", "甲部门",
							"行标题2", "乙部门", "列标题1", "准时", "列标题2", "完整"));
			sheet(workbook, "上传题", SIMPLE_HEADERS,
					cells("序号", "12", "题干", "上传：请交作业照片", "分数", "5", "答案", "身份证正面照"));
			sheet(workbook, "矩阵填空题", matrixHeaders(),
					cells("序号", "13", "题干", "矩阵填空：请填写联系方式", "分数", "5", "答案", "张三|李四", "行标题1", "张三",
							"行标题2", "李四", "列标题1", "姓名", "列标题2", "电话"));
			workbook.finish();
			return out.toByteArray();
		}
	}

	private byte[] fillBlankWorkbook() throws Exception {
		try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			Workbook workbook = new Workbook(out, "题库", "1.0");
			sheet(workbook, "填空题", BLANK_HEADERS,
					List.of(cells("序号", "1", "题干", "古诗作者的朝代是____", "空1", "唐"),
							cells("序号", "2", "题干", "三个代表重要思想的三大____", "空1", "甲", "空2", "乙", "空3", "丙")));
			workbook.finish();
			return out.toByteArray();
		}
	}

	private static final String[] OPTION_HEADERS = { "序号", "章节", "题干", "分数", "难度", "标签", "解析", "答案", "选项A", "选项B",
			"选项C", "选项D", "选项E", "选项F", "选项G", "选项H", "高级配置(JSON)" };

	private static final String[] BLANK_HEADERS = { "序号", "章节", "题干", "分数", "难度", "标签", "解析", "答案", "空1", "空2", "空3",
			"空4", "空5", "空6", "空7", "空8", "高级配置(JSON)" };

	private static final String[] SIMPLE_HEADERS = { "序号", "章节", "题干", "分数", "难度", "标签", "解析", "答案", "高级配置(JSON)" };

	private static final String[] CASCADER_HEADERS = { "序号", "章节", "题干", "分数", "难度", "标签", "解析", "答案", "选项树(JSON)",
			"高级配置(JSON)" };

	private static String[] matrixHeaders() {
		List<String> headers = new ArrayList<>(Arrays.asList("序号", "章节", "题干", "分数", "难度", "标签", "解析", "答案"));
		for (int i = 1; i <= 10; i++) {
			headers.add("行标题" + i);
		}
		for (int i = 1; i <= 10; i++) {
			headers.add("列标题" + i);
		}
		headers.add("高级配置(JSON)");
		return headers.toArray(new String[0]);
	}

	private void sheet(Workbook workbook, String name, String[] headers, Map<String, String> values) {
		sheet(workbook, name, headers, List.of(values));
	}

	private void sheet(Workbook workbook, String name, String[] headers, List<Map<String, String>> rows) {
		Worksheet sheet = workbook.newWorksheet(name);
		for (int column = 0; column < headers.length; column++) {
			sheet.value(0, column, headers[column]);
		}
		for (int index = 0; index < rows.size(); index++) {
			Map<String, String> values = rows.get(index);
			for (int column = 0; column < headers.length; column++) {
				String value = values.get(headers[column]);
				if (value != null && !value.isEmpty()) {
					sheet.value(index + 1, column, value);
				}
			}
		}
	}

	private Map<String, String> cells(String... pairs) {
		Map<String, String> map = new LinkedHashMap<>();
		for (int i = 0; i + 1 < pairs.length; i += 2) {
			map.put(pairs[i], pairs[i + 1]);
		}
		return map;
	}

	// ------ 解析 / 断言用的辅助

	/** 原样解析：导出产出的字节必须不经加工就能过导入的安全校验，这里不做任何兜底 */
	private List<TemplateRequest> parse(byte[] xlsx) {
		MultipartFile file = new MockMultipartFile("file", "repo-export.xlsx", XLSX, xlsx);
		return new RepoTemplateExcelParseHelper(file).parse();
	}

	/** 解析测试自己造的 fixture：fastexcel 直接写出的 zip 描述符有问题，先规范化一次再进导入 */
	private List<TemplateRequest> parseFixture(byte[] xlsx) throws Exception {
		return parse(RepoQuestionExcelExporter.normalizeZip(xlsx));
	}

	/** 解析结果 → 导出器入参：等价于库里 t_template 的一行（tag 列留空，走 schema.tags 回退） */
	private List<Template> toTemplates(List<TemplateRequest> requests) {
		List<Template> templates = new ArrayList<>();
		for (TemplateRequest request : requests) {
			Template template = new Template();
			template.setId(request.getTemplate().getId());
			template.setName(request.getName());
			template.setChapter(request.getChapter());
			template.setDifficulty(request.getDifficulty());
			template.setQuestionType(request.getQuestionType());
			template.setTemplate(request.getTemplate());
			templates.add(template);
		}
		return templates;
	}

	private List<String> sheetNames(byte[] xlsx) throws Exception {
		try (ReadableWorkbook workbook = new ReadableWorkbook(new ByteArrayInputStream(xlsx))) {
			return workbook.getSheets().map(Sheet::getName).collect(Collectors.toList());
		}
	}

	private List<String> headerOf(byte[] xlsx, String sheetName) throws Exception {
		try (ReadableWorkbook workbook = new ReadableWorkbook(new ByteArrayInputStream(xlsx))) {
			Sheet sheet = workbook.getSheets().filter(item -> sheetName.equals(item.getName())).findFirst()
					.orElseThrow(() -> new AssertionError("缺少工作表：" + sheetName));
			try (Stream<Row> rows = sheet.openStream()) {
				Row header = rows.findFirst().orElseThrow(() -> new AssertionError("工作表没有表头：" + sheetName));
				List<String> texts = new ArrayList<>();
				for (int column = 0; column < header.getCellCount(); column++) {
					texts.add(header.getCellText(column));
				}
				return texts;
			}
		}
	}

	private boolean isImportableHeader(String header) {
		return RepoTemplateI18n.HeaderLabel.fromText(header) != null || RepoTemplateI18n.optionSuffix(header) != null
				|| RepoTemplateI18n.isBlankColumn(header) || RepoTemplateI18n.rowTitleIndex(header) != null
				|| RepoTemplateI18n.columnTitleIndex(header) != null;
	}

	private SurveySchema questionOf(List<TemplateRequest> requests, String titleKeyword) {
		return requests.stream()
				.filter(item -> item.getTemplate() != null && item.getTemplate().getTitle() != null
						&& item.getTemplate().getTitle().contains(titleKeyword))
				.map(TemplateRequest::getTemplate).findFirst()
				.orElseThrow(() -> new AssertionError("导出结果里找不到题目：" + titleKeyword + "，实际：" + titles(requests)));
	}

	private String titleOf(TemplateRequest request) {
		return request.getTemplate() == null ? null : request.getTemplate().getTitle();
	}

	private List<String> titles(List<TemplateRequest> requests) {
		return requests.stream().map(this::titleOf).collect(Collectors.toList());
	}

	private List<String> optionTitles(SurveySchema schema) {
		assertNotNull(schema.getChildren());
		return schema.getChildren().stream().map(SurveySchema::getTitle).collect(Collectors.toList());
	}

	private List<String> correctOptions(SurveySchema schema) {
		return schema.getChildren().stream()
				.filter(child -> child.getAttribute() != null
						&& child.getAttribute().getExamCorrectAnswer() != null)
				.map(SurveySchema::getTitle).collect(Collectors.toList());
	}

	private List<String> blankAnswers(SurveySchema schema) {
		return schema.getChildren().stream().map(child -> child.getAttribute() == null ? null
				: child.getAttribute().getExamCorrectAnswer()).collect(Collectors.toList());
	}

	private List<String> rowTitles(SurveySchema schema) {
		return schema.getRow().stream().map(SurveySchema.Row::getTitle).collect(Collectors.toList());
	}

	private List<String> columnTitles(SurveySchema schema) {
		return schema.getDataSource().stream().map(SurveySchema.DataSource::getLabel).collect(Collectors.toList());
	}

}
