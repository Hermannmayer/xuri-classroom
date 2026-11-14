package cn.surveyking.server.core.importer;

import cn.surveyking.server.domain.dto.SurveySchema;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WordQuestionParserTest {

	private MultipartFile fixture(String name) throws Exception {
		try (InputStream in = new ClassPathResource("import/" + name).getInputStream()) {
			return new MockMultipartFile("file", name,
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document", in);
		}
	}

	@Test
	void parsesTemplateWithHeadings() throws Exception {
		ImportPreview preview = new WordQuestionParser(fixture("word-template.docx")).parse();

		assertEquals(5, preview.getFlat().size());
		assertEquals(30D, preview.getStats().getScore(), 0.001);
		assertEquals(4, preview.getStats().getGroups());
		assertEquals(4, preview.getTree().getChildren().size());
		assertTrue(preview.getTree().getChildren().stream()
				.allMatch(node -> node.getType() == SurveySchema.QuestionType.QuestionSet));
		assertEquals("一、单选题（本大题共 2 小题，每小题 5 分）", preview.getTree().getChildren().get(0).getTitle());
		assertEquals(2, preview.getTree().getChildren().get(0).getChildren().size());

		SurveySchema radio = preview.getFlat().get(0);
		assertEquals(SurveySchema.QuestionType.Radio, radio.getType());
		assertEquals(4, radio.getChildren().size());
		assertEquals("B", answerLetter(radio));

		SurveySchema judge = preview.getFlat().get(2);
		assertEquals(SurveySchema.QuestionType.Judge, judge.getType());

		SurveySchema fill = preview.getFlat().get(3);
		assertEquals(SurveySchema.QuestionType.FillBlank, fill.getType());
		assertEquals("119", fill.getChildren().get(0).getAttribute().getExamCorrectAnswer());

		SurveySchema textarea = preview.getFlat().get(4);
		assertEquals(SurveySchema.QuestionType.Textarea, textarea.getType());
	}

	private String answerLetter(SurveySchema question) {
		for (int i = 0; i < question.getChildren().size(); i++) {
			if (question.getChildren().get(i).getAttribute().getExamCorrectAnswer() != null) {
				return String.valueOf((char) ('A' + i));
			}
		}
		return "";
	}

}
