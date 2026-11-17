package cn.surveyking.server.core.importer;

import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.Picture;
import org.apache.poi.ss.usermodel.PictureData;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFShape;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * Excel 内嵌图片按行索引：sheet 名 → 1 基行号 → 图片字节。
 *
 * <p>
 * fastexcel 不读图片，所以导入时用 POI 把同一份 .xlsx 再打开一次，按 {@link ClientAnchor} 的
 * <b>左上角所在行</b>归属（图片跨行、或锚点落在合并单元格里，也以左上角行为准，可能与肉眼位置差一行）。
 *
 * <p>
 * 只取 png/jpg/jpeg/gif/bmp；单张超过 {@value #MAX_IMAGE_BYTES} 字节跳过、整份超过 {@value #MAX_IMAGES} 张截断，
 * 两种情况都记一条 warning。读取失败不抛异常（返回空表 + warning）：图片读不出来不该拖垮文字题目的导入。
 */
public final class ExcelRowImages {

	/** 单张内嵌图片上限 2MB：超过就跳过（避免一次导入把附件目录撑爆） */
	public static final long MAX_IMAGE_BYTES = 2L * 1024 * 1024;

	/** 单份 Excel 最多取 50 张内嵌图片 */
	public static final int MAX_IMAGES = 50;

	private static final List<String> IMAGE_EXTENSIONS = Arrays.asList("png", "jpg", "jpeg", "gif", "bmp");

	private final Map<String, Map<Integer, List<byte[]>>> rowImages;

	private final List<Warning> warnings;

	private ExcelRowImages(Map<String, Map<Integer, List<byte[]>>> rowImages, List<Warning> warnings) {
		this.rowImages = rowImages;
		this.warnings = warnings;
	}

	public static ExcelRowImages empty() {
		return new ExcelRowImages(new LinkedHashMap<>(), new ArrayList<>());
	}

	/**
	 * 读一份 xlsx 里的全部内嵌图片；任何异常都退化成空表 + 一条 warning。
	 */
	public static ExcelRowImages read(byte[] bytes) {
		List<Warning> warnings = new ArrayList<>();
		Map<String, Map<Integer, List<byte[]>>> rowImages = new LinkedHashMap<>();
		if (bytes == null || bytes.length == 0) {
			return new ExcelRowImages(rowImages, warnings);
		}
		int[] count = { 0 };
		boolean[] limitReached = { false };
		try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
			for (int index = 0; index < workbook.getNumberOfSheets() && !limitReached[0]; index++) {
				XSSFSheet sheet = workbook.getSheetAt(index);
				XSSFDrawing drawing = sheet.getDrawingPatriarch();
				if (drawing == null) {
					continue;
				}
				for (XSSFShape shape : drawing.getShapes()) {
					if (limitReached[0]) {
						break;
					}
					if (!(shape instanceof Picture)) {
						continue;
					}
					Picture picture = (Picture) shape;
					PictureData data = picture.getPictureData();
					ClientAnchor anchor = picture.getClientAnchor();
					if (data == null || anchor == null) {
						continue;
					}
					String extension = data.suggestFileExtension() == null ? ""
							: data.suggestFileExtension().toLowerCase(Locale.ROOT);
					if (!IMAGE_EXTENSIONS.contains(extension)) {
						// emf/wmf 这类矢量图前端渲染不了，静默跳过
						continue;
					}
					byte[] imageBytes = data.getData();
					if (imageBytes == null || imageBytes.length == 0) {
						continue;
					}
					if (imageBytes.length > MAX_IMAGE_BYTES) {
						warnings.add(new Warning("IMAGE_TOO_LARGE",
								"工作表「" + sheet.getSheetName() + "」有图片超过 2MB，已跳过"));
						continue;
					}
					if (++count[0] > MAX_IMAGES) {
						limitReached[0] = true;
						warnings.add(new Warning("IMAGE_LIMIT_EXCEEDED",
								"Excel 内嵌图片超过 " + MAX_IMAGES + " 张，只取前 " + MAX_IMAGES + " 张"));
						break;
					}
					int rowNum = anchor.getRow1() + 1;
					rowImages.computeIfAbsent(sheet.getSheetName(), key -> new TreeMap<>())
							.computeIfAbsent(rowNum, key -> new ArrayList<>()).add(imageBytes);
				}
			}
		}
		catch (Exception e) {
			warnings.add(new Warning("IMAGE_READ_FAILED", "读取 Excel 内嵌图片失败，已按无图片导入：" + describe(e)));
		}
		return new ExcelRowImages(rowImages, warnings);
	}

	/**
	 * 某 sheet 某行（1 基）的图片；没有就返回空列表。
	 */
	public List<byte[]> imagesOf(String sheetName, Integer rowNum) {
		if (sheetName == null || rowNum == null) {
			return Collections.emptyList();
		}
		Map<Integer, List<byte[]>> rows = rowImages.get(sheetName);
		List<byte[]> images = rows == null ? null : rows.get(rowNum);
		return images == null ? Collections.emptyList() : images;
	}

	public boolean isEmpty() {
		return rowImages.isEmpty();
	}

	/** 抽到的图片总张数 */
	public int count() {
		int total = 0;
		for (Map<Integer, List<byte[]>> rows : rowImages.values()) {
			for (List<byte[]> images : rows.values()) {
				total += images.size();
			}
		}
		return total;
	}

	public List<Warning> getWarnings() {
		return warnings;
	}

	private static String describe(Throwable e) {
		if (e == null) {
			return "未知错误";
		}
		String message = e.getMessage();
		if (message == null || message.isBlank()) {
			return e.getClass().getSimpleName();
		}
		return message.length() > 200 ? message.substring(0, 200) + "…" : message;
	}

	/**
	 * 跳过的图片原因（不致命，调用方并入 ImportPreview.warnings 或日志）。
	 */
	public static final class Warning {

		private final String code;

		private final String message;

		public Warning(String code, String message) {
			this.code = code;
			this.message = message;
		}

		public String getCode() {
			return code;
		}

		public String getMessage() {
			return message;
		}

	}

}
