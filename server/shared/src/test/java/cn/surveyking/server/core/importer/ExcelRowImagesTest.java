package cn.surveyking.server.core.importer;

import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
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
	@DisplayName("跨行锚点（纵向超过一行）：跳过并给 IMAGE_ANCHOR_SPANS_ROWS，message 带 sheet 与行号")
	void skipsImageWhoseAnchorSpansRows() throws Exception {
		// 从 0 基第 2 行顶到第 4 行顶 = 占满两行：肉眼同时压在「第二题」和下一行上，挂哪行都是猜
		ExcelRowImages images = ExcelRowImages.read(workbookWithAnchor(2, 4, 0));

		assertEquals(0, images.count(), "跨行图片不能按左上角硬挂");
		assertTrue(images.imagesOf("单选题", 3).isEmpty());
		assertTrue(images.imagesOf("单选题", 4).isEmpty());
		ExcelRowImages.Warning warning = images.getWarnings().stream()
				.filter(item -> "IMAGE_ANCHOR_SPANS_ROWS".equals(item.getCode())).findFirst()
				.orElseThrow(() -> new AssertionError("跨行图片必须给一条 IMAGE_ANCHOR_SPANS_ROWS 警告"));
		assertTrue(warning.getMessage().contains("单选题"), warning.getMessage());
		assertTrue(warning.getMessage().contains("第 3 行"), warning.getMessage());
		assertTrue(warning.getMessage().contains("单个单元格内"), warning.getMessage());
	}

	@Test
	@DisplayName("压到下一行里（row2 = row1 + 1 但右下角有偏移）：同样按跨行跳过")
	void skipsImageThatOverflowsIntoNextRow() throws Exception {
		ExcelRowImages images = ExcelRowImages.read(workbookWithAnchor(2, 3, 120_000));

		assertEquals(0, images.count());
		assertTrue(
				images.getWarnings().stream().anyMatch(item -> "IMAGE_ANCHOR_SPANS_ROWS".equals(item.getCode())),
				"右下角带偏移的图片已经伸进下一行，必须告警");
	}

	@Test
	@DisplayName("纵向落在一行之内（row2 = row1）：仍按左上角行归属，且不告警")
	void keepsImageInsideSingleRow() throws Exception {
		ExcelRowImages images = ExcelRowImages.read(workbookWithAnchor(2, 2, 60_000));

		assertEquals(1, images.count());
		assertTrue(images.getWarnings().isEmpty(), "单行图片不该有 warning");
		assertEquals(1, images.imagesOf("单选题", 3).size());
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

	/**
	 * 造一份「单选题」表，图片锚点的上下两个行标由调用方给。
	 * @param row1 左上角的 0 基行号
	 * @param row2 右下角的 0 基行号
	 * @param dy2 右下角在 row2 内的偏移（EMU）
	 */
	private byte[] workbookWithAnchor(int row1, int row2, int dy2) throws Exception {
		try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			XSSFSheet sheet = workbook.createSheet("单选题");
			sheet.createRow(0).createCell(0).setCellValue("题干");
			sheet.createRow(1).createCell(0).setCellValue("第一题");
			sheet.createRow(2).createCell(0).setCellValue("第二题");
			sheet.createRow(3).createCell(0).setCellValue("第三题");

			int pictureIndex = workbook.addPicture(dotPng(), Workbook.PICTURE_TYPE_PNG);
			CreationHelper helper = workbook.getCreationHelper();
			XSSFDrawing drawing = sheet.createDrawingPatriarch();
			ClientAnchor anchor = helper.createClientAnchor();
			anchor.setRow1(row1);
			anchor.setCol1(3);
			anchor.setRow2(row2);
			anchor.setCol2(4);
			anchor.setDy2(dy2);
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
