package cn.surveyking.server.core.importer;

import cn.surveyking.server.domain.dto.SurveySchema;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * 随产品发布的两个导入模板（server/api/src/main/resources/template/）必须真的能导入：
 * 模板和解析器一旦漂移，这里立刻红。
 */
class ImportTemplateFilesTest {

	private static final Path TEMPLATE_DIR = Paths.get("..", "api", "src", "main", "resources", "template")
			.toAbsolutePath().normalize();

	@Test
	void shippedRepoTemplateIsImportable() throws Exception {
		Path file = TEMPLATE_DIR.resolve("旭日云课堂题库导入模板.xlsx");
		assumeTrue(Files.exists(file), "跳过：没有发布模板 " + file);
		MultipartFile upload = new MockMultipartFile("file", file.getFileName().toString(),
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Files.readAllBytes(file));

		ImportPreview preview = new ExcelQuestionParser(upload).parse();

		assertEquals(13, preview.getFlat().size(), "模板应含 13 个 sheet 的示例题");
		List<SurveySchema.QuestionType> types = preview.getFlat().stream().map(SurveySchema::getType)
				.collect(Collectors.toList());
		assertEquals(13, types.stream().distinct().count(), "13 道示例题应覆盖 13 种题型：" + types);
		assertTrue(types.contains(SurveySchema.QuestionType.Select));
		assertTrue(types.contains(SurveySchema.QuestionType.Cascader));
		assertTrue(types.contains(SurveySchema.QuestionType.MatrixFillBlank));
		assertEquals(9, preview.getStats().getGroups(), "模板示例按「章节」拆成 9 个大题");
		assertTrue(types.contains(SurveySchema.QuestionType.Upload), "上传题 sheet 应能导入：" + types);
		assertTrue(preview.getWarnings().stream().noneMatch(item -> "ADVANCED_JSON_INVALID".equals(item.getCode())));

		SurveySchema cascader = preview.getFlat().stream()
				.filter(item -> item.getType() == SurveySchema.QuestionType.Cascader).findFirst().orElseThrow();
		assertEquals(2, cascader.getDataSource().size());
		assertEquals("jn", cascader.getAttribute().getExamCorrectAnswer());

		SurveySchema matrix = preview.getFlat().stream()
				.filter(item -> item.getType() == SurveySchema.QuestionType.MatrixRadio).findFirst().orElseThrow();
		assertEquals(2, matrix.getRow().size());
		assertEquals(2, matrix.getDataSource().size());
		assertEquals("A|B", matrix.getAttribute().getExamCorrectAnswer());
	}

	@Test
	void shippedPaperTemplateIsImportable() throws Exception {
		Path file = TEMPLATE_DIR.resolve("旭日云课堂试卷导入模板.docx");
		assumeTrue(Files.exists(file), "跳过：没有发布模板 " + file);
		MultipartFile upload = new MockMultipartFile("file", file.getFileName().toString(),
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document", Files.readAllBytes(file));

		ImportPreview preview = new WordQuestionParser(upload).parse();

		List<SurveySchema.QuestionType> types = preview.getFlat().stream().map(SurveySchema::getType)
				.collect(Collectors.toList());
		assertEquals(11, preview.getFlat().size(), "Word 模板示例应解析出 11 道题：" + types);
		assertTrue(types.contains(SurveySchema.QuestionType.Select), "下拉题标记：" + types);
		assertTrue(types.contains(SurveySchema.QuestionType.Score), "评分题标记：" + types);
		assertTrue(types.contains(SurveySchema.QuestionType.Nps), "NPS 标记：" + types);
		assertTrue(types.contains(SurveySchema.QuestionType.MatrixRadio), "矩阵单选标记：" + types);
		assertTrue(types.contains(SurveySchema.QuestionType.Upload), "上传题标记：" + types);

		SurveySchema matrix = preview.getFlat().stream()
				.filter(item -> item.getType() == SurveySchema.QuestionType.MatrixRadio).findFirst().orElseThrow();
		assertEquals(2, matrix.getRow().size());
		assertEquals(2, matrix.getDataSource().size());
		assertEquals("A|B", matrix.getAttribute().getExamCorrectAnswer());
	}

}
