package cn.surveyking.server.core.importer;

import cn.surveyking.server.domain.dto.SurveySchema;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonQuestionParserTest {

	private MultipartFile fixture(String name) throws Exception {
		try (InputStream in = new ClassPathResource("import/" + name).getInputStream()) {
			return new MockMultipartFile("file", name, "application/json", in);
		}
	}

	@Test
	void parsesAndRegeneratesIds() throws Exception {
		ImportPreview preview = new JsonQuestionParser(fixture("sample-survey.json")).parse();

		assertEquals("JSON 导入示例", preview.getTitle());
		assertEquals(2, preview.getFlat().size());
		assertEquals(15D, preview.getStats().getScore(), 0.001);

		SurveySchema radio = preview.getFlat().get(0);
		assertEquals(SurveySchema.QuestionType.Radio, radio.getType());
		assertNotEquals("Q1", radio.getId());
		assertEquals(2, radio.getDataSource().size());
		SurveySchema correct = radio.getChildren().stream()
				.filter(child -> child.getAttribute() != null && child.getAttribute().getExamCorrectAnswer() != null)
				.findFirst().orElseThrow(() -> new AssertionError("没有正确答案"));
		assertEquals(correct.getId(), correct.getAttribute().getExamCorrectAnswer());
		assertEquals(correct.getId(), radio.getDataSource().get(1).getValue());

		SurveySchema textarea = preview.getFlat().get(1);
		assertEquals("参考答案", textarea.getChildren().get(0).getAttribute().getExamCorrectAnswer());
		assertTrue(preview.getWarnings().stream().anyMatch(item -> "JSON_REID".equals(item.getCode())));
		assertNotNull(preview.getTree());
	}

}
