package cn.surveyking.server.core.importer;

import cn.surveyking.server.domain.dto.FileView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateRequest;
import cn.surveyking.server.domain.dto.UploadFileRequest;
import cn.surveyking.server.service.FileService;
import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 导入图片挂题干的公共逻辑（题库导入用它把图片落到题干上）。
 */
class QuestionImageUploaderTest {

	@Test
	void appendsImageAndMarksRichTitle() throws Exception {
		FileService fileService = mock(FileService.class);
		FileView view = new FileView();
		view.setId("f123");
		when(fileService.upload(any(UploadFileRequest.class))).thenReturn(view);
		SurveySchema schema = SurveySchema.builder().id("q1").title("题干").build();

		int attached = QuestionImageUploader.attach(fileService, schema, List.of(dotPng()));

		assertEquals(1, attached);
		assertTrue(schema.getTitle().startsWith("题干 <img src=\"/api/public/preview/f123\""), schema.getTitle());
		assertEquals(Boolean.TRUE, schema.getAttribute().getRichTitle());
	}

	@Test
	void keepsTitleWhenUploadFails() throws Exception {
		FileService fileService = mock(FileService.class);
		when(fileService.upload(any(UploadFileRequest.class))).thenThrow(new IllegalStateException("boom"));
		SurveySchema schema = SurveySchema.builder().id("q1").title("题干").build();

		assertEquals(0, QuestionImageUploader.attach(fileService, schema, List.of(dotPng())));
		assertEquals("题干", schema.getTitle());
	}

	@Test
	void skipsBytesThatAreNotImages() {
		FileService fileService = mock(FileService.class);
		SurveySchema schema = SurveySchema.builder().id("q1").title("题干").build();

		int attached = QuestionImageUploader.attach(fileService, schema,
				List.of("plain-text".getBytes(StandardCharsets.UTF_8)));

		assertEquals(0, attached);
		assertEquals("题干", schema.getTitle());
		assertNotNull(schema.getAttribute());
	}

	@Test
	void guessImageExtensionReadsMagicHeaders() throws Exception {
		assertEquals("png", QuestionImageUploader.guessImageExtension(dotPng()));
		assertNull(QuestionImageUploader.guessImageExtension(null));
		assertNull(QuestionImageUploader.guessImageExtension(new byte[] { 1, 2, 3 }));
	}

	/**
	 * 题库导入走的那条路：按 TemplateRequest 的 sourceSheet/sourceRow 精确挂图，不会挂错行。
	 */
	@Test
	void attachesImagesBySourceRow() throws Exception {
		FileService fileService = mock(FileService.class);
		FileView view = new FileView();
		view.setId("f456");
		when(fileService.upload(any(UploadFileRequest.class))).thenReturn(view);

		ExcelRowImages rowImages = ExcelRowImages.read(workbookWithImageOnThirdRow());
		TemplateRequest first = TemplateRequest.builder()
				.template(SurveySchema.builder().id("q1").title("第一题").build()).sourceSheet("单选题").sourceRow(2)
				.build();
		TemplateRequest second = TemplateRequest.builder()
				.template(SurveySchema.builder().id("q2").title("第二题").build()).sourceSheet("单选题").sourceRow(3)
				.build();

		int attached = QuestionImageUploader.attachRowImages(fileService, List.of(first, second), rowImages);

		assertEquals(1, attached);
		assertEquals("第一题", first.getTemplate().getTitle(), "锚点在第 3 行，不能挂到第 2 行");
		assertTrue(second.getTemplate().getTitle()
				.startsWith("第二题 <img src=\"/api/public/preview/f456\""), second.getTemplate().getTitle());
	}

	/** 造一份「单选题」表：图片锚点落在 0 基第 2 行（1 基第 3 行） */
	private byte[] workbookWithImageOnThirdRow() throws Exception {
		try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			XSSFSheet sheet = workbook.createSheet("单选题");
			sheet.createRow(0).createCell(0).setCellValue("题干");
			sheet.createRow(1).createCell(0).setCellValue("第一题");
			sheet.createRow(2).createCell(0).setCellValue("第二题");
			int pictureIndex = workbook.addPicture(dotPng(), Workbook.PICTURE_TYPE_PNG);
			CreationHelper helper = workbook.getCreationHelper();
			XSSFDrawing drawing = sheet.createDrawingPatriarch();
			ClientAnchor anchor = helper.createClientAnchor();
			anchor.setRow1(2);
			anchor.setCol1(1);
			anchor.setRow2(3);
			anchor.setCol2(2);
			drawing.createPicture(anchor, pictureIndex);
			workbook.write(out);
			return out.toByteArray();
		}
	}

	private byte[] dotPng() throws Exception {
		try (InputStream in = new ClassPathResource("import/dot.png").getInputStream()) {
			return in.readAllBytes();
		}
	}

}
