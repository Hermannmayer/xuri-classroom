package cn.surveyking.server.core.importer;

import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateRequest;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExcelQuestionParserTest {

	private MultipartFile fixture(String name) throws Exception {
		try (InputStream in = new ClassPathResource("import/" + name).getInputStream()) {
			return new MockMultipartFile("file", name, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					in);
		}
	}

	private SurveySchema byType(ImportPreview preview, SurveySchema.QuestionType type) {
		return preview.getFlat().stream().filter(item -> item.getType() == type).findFirst()
				.orElseThrow(() -> new AssertionError("缺少题型 " + type));
	}

	@Test
	void parsesRepoTemplateAsFlatQuestions() throws Exception {
		ImportPreview preview = new ExcelQuestionParser(fixture("repo-template.xlsx")).parse();

		assertEquals(5, preview.getFlat().size());
		assertEquals(5, preview.getStats().getTotal());
		assertEquals(0, preview.getStats().getGroups());
		assertTrue(preview.getTree().getChildren().stream()
				.noneMatch(node -> node.getType() == SurveySchema.QuestionType.QuestionSet));

		SurveySchema radio = byType(preview, SurveySchema.QuestionType.Radio);
		assertEquals(4, radio.getChildren().size());
		assertEquals(4, radio.getDataSource().size());
		assertEquals(2D, radio.getAttribute().getExamScore(), 0.001);

		SurveySchema checkbox = byType(preview, SurveySchema.QuestionType.Checkbox);
		assertEquals(4, checkbox.getChildren().size());
		assertEquals(4, checkbox.getChildren().stream()
				.filter(child -> child.getAttribute() != null && child.getAttribute().getExamCorrectAnswer() != null)
				.count());

		SurveySchema fill = byType(preview, SurveySchema.QuestionType.MultipleBlank);
		assertEquals(4, fill.getChildren().size());
		assertEquals(2.5D, fill.getAttribute().getExamScore(), 0.001);
	}

	@Test
	void groupsByChapterColumn() {
		SurveySchema first = question("q1", "第一题", SurveySchema.QuestionType.Radio);
		SurveySchema second = question("q2", "第二题", SurveySchema.QuestionType.Checkbox);
		SurveySchema third = question("q3", "第三题", SurveySchema.QuestionType.Judge);
		SurveySchema loose = question("q4", "散题", SurveySchema.QuestionType.FillBlank);

		ImportPreview preview = ExcelQuestionParser.fromTemplates(Arrays.asList(
				TemplateRequest.builder().chapter("第一章 单选").template(first).build(),
				TemplateRequest.builder().chapter("第一章 单选").template(second).build(),
				TemplateRequest.builder().chapter("第二章 判断").template(third).build(),
				TemplateRequest.builder().template(loose).build()));

		assertEquals(4, preview.getFlat().size());
		assertEquals(2, preview.getStats().getGroups());
		assertEquals(3, preview.getTree().getChildren().size());
		assertEquals("第一章 单选", preview.getTree().getChildren().get(0).getTitle());
		assertEquals(2, preview.getTree().getChildren().get(0).getChildren().size());
		assertEquals(SurveySchema.QuestionType.FillBlank, preview.getTree().getChildren().get(2).getType());
		assertTrue(preview.getWarnings().stream().anyMatch(item -> "CHAPTER_GROUPED".equals(item.getCode())));
	}

	private SurveySchema question(String id, String title, SurveySchema.QuestionType type) {
		return SurveySchema.builder().id(id).title(title).type(type)
				.attribute(SurveySchema.Attribute.builder().examScore(5D).build()).build();
	}

}
