package cn.surveyking.server.core.importer;

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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Excel 内嵌图片按「锚点左上角所在行」归属（题库导入与试卷导入共用这一层）。
 */
class ExcelRowImagesTest {

	@Test
	void mapsImageToAnchorTopRow() throws Exception {
		try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			XSSFSheet sheet = workbook.createSheet("单选题");
			sheet.createRow(0).createCell(0).setCellValue("题干");
			sheet.createRow(1).createCell(0).setCellValue("第一题");
			sheet.createRow(2).createCell(0).setCellValue("第二题");

			int pictureIndex = workbook.addPicture(dotPng(), Workbook.PICTURE_TYPE_PNG);
			CreationHelper helper = workbook.getCreationHelper();
			XSSFDrawing drawing = sheet.createDrawingPatriarch();
			// 锚点左上角落在 0 基第 2 行 = 1 基第 3 行（「第二题」那行）
			ClientAnchor anchor = helper.createClientAnchor();
			anchor.setRow1(2);
			anchor.setCol1(3);
			anchor.setRow2(3);
			anchor.setCol2(4);
			drawing.createPicture(anchor, pictureIndex);

			workbook.write(out);
			ExcelRowImages images = ExcelRowImages.read(out.toByteArray());

			assertEquals(1, images.count());
			assertTrue(images.getWarnings().isEmpty(), "正常文件不该有 warning");
			assertEquals(1, images.imagesOf("单选题", 3).size());
			assertTrue(images.imagesOf("单选题", 1).isEmpty(), "图片只归锚点那一行");
			assertTrue(images.imagesOf("其它表", 3).isEmpty());
			assertTrue(images.imagesOf(null, 3).isEmpty());
			assertTrue(images.imagesOf("单选题", null).isEmpty());
		}
	}

	@Test
	void degradesToEmptyWhenFileIsNotWorkbook() {
		ExcelRowImages broken = ExcelRowImages.read("not-a-zip".getBytes(StandardCharsets.UTF_8));

		assertTrue(broken.isEmpty());
		assertEquals(0, broken.count());
		assertTrue(broken.getWarnings().stream().anyMatch(item -> "IMAGE_READ_FAILED".equals(item.getCode())));
		assertTrue(ExcelRowImages.read(null).isEmpty());
		assertTrue(ExcelRowImages.read(new byte[0]).isEmpty());
	}

	private byte[] dotPng() throws Exception {
		try (InputStream in = new ClassPathResource("import/dot.png").getInputStream()) {
			return in.readAllBytes();
		}
	}

}
