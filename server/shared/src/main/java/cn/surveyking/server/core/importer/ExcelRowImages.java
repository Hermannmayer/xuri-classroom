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
import java.util.Set;
import java.util.TreeMap;














public final class ExcelRowImages {


	public static final long MAX_IMAGE_BYTES = 2L * 1024 * 1024;


	public static final int MAX_IMAGES = 50;

	private static final List<String> IMAGE_EXTENSIONS = Arrays.asList("png", "jpg", "jpeg", "gif", "bmp");

	private final Map<String, Map<Integer, List<byte[]>>> rowImages;

	private final Map<String, Map<Integer, Map<Integer, List<byte[]>>>> cellImages;

	private final List<Warning> warnings;

	private ExcelRowImages(Map<String, Map<Integer, List<byte[]>>> rowImages,
			Map<String, Map<Integer, Map<Integer, List<byte[]>>>> cellImages, List<Warning> warnings) {
		this.rowImages = rowImages;
		this.cellImages = cellImages;
		this.warnings = warnings;
	}

	public static ExcelRowImages empty() {
		return new ExcelRowImages(new LinkedHashMap<>(), new LinkedHashMap<>(), new ArrayList<>());
	}

	/** 读一份 xlsx 里的全部内嵌图片；任何异常都退化成空表 + 一条 warning */
	public static ExcelRowImages read(byte[] bytes) {
		List<Warning> warnings = new ArrayList<>();
		Map<String, Map<Integer, List<byte[]>>> rowImages = new LinkedHashMap<>();
		Map<String, Map<Integer, Map<Integer, List<byte[]>>>> cellImages = new LinkedHashMap<>();
		if (bytes == null || bytes.length == 0) {
			return new ExcelRowImages(rowImages, cellImages, warnings);
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
					if (spansRows(anchor)) {

						warnings.add(new Warning("IMAGE_ANCHOR_SPANS_ROWS", "工作表「" + sheet.getSheetName() + "」第 "
								+ rowNum + " 行的图片跨了多行，已跳过；请把图片贴到单个单元格内再导入"));
						continue;
					}
					rowImages.computeIfAbsent(sheet.getSheetName(), key -> new TreeMap<>())
							.computeIfAbsent(rowNum, key -> new ArrayList<>()).add(imageBytes);
					cellImages.computeIfAbsent(sheet.getSheetName(), key -> new TreeMap<>())
							.computeIfAbsent(rowNum, key -> new TreeMap<>())
							.computeIfAbsent((int) anchor.getCol1(), key -> new ArrayList<>()).add(imageBytes);
				}
			}
		}
		catch (Exception e) {
			warnings.add(new Warning("IMAGE_READ_FAILED", "读取 Excel 内嵌图片失败，已按无图片导入：" + describe(e)));
		}
		return new ExcelRowImages(rowImages, cellImages, warnings);
	}

	/** 图片锚点是否跨行（纵向范围超过一行）；返回 true 表示纵向超出一行，按左上角行归属不可靠 */
	private static boolean spansRows(ClientAnchor anchor) {
		int fromRow = anchor.getRow1();
		int toRow = anchor.getRow2();
		if (toRow <= fromRow) {

			return false;
		}

		return !(toRow == fromRow + 1 && anchor.getDy2() == 0);
	}

	/** 某 sheet 某行（1 基）的图片；没有就返回空列表 */
	public List<byte[]> imagesOf(String sheetName, Integer rowNum) {
		if (sheetName == null || rowNum == null) {
			return Collections.emptyList();
		}
		Map<Integer, List<byte[]>> rows = rowImages.get(sheetName);
		List<byte[]> images = rows == null ? null : rows.get(rowNum);
		return images == null ? Collections.emptyList() : images;
	}

	/** 某 sheet 某行某列（列 0 基，与 POI / 表头列索引一致）的图片 */
	public List<byte[]> imagesOfCell(String sheetName, Integer rowNum, Integer colNum) {
		if (sheetName == null || rowNum == null || colNum == null) {
			return Collections.emptyList();
		}
		Map<Integer, Map<Integer, List<byte[]>>> rows = cellImages.get(sheetName);
		Map<Integer, List<byte[]>> cells = rows == null ? null : rows.get(rowNum);
		List<byte[]> images = cells == null ? null : cells.get(colNum);
		return images == null ? Collections.emptyList() : images;
	}

	/** 某 sheet 某行图片，排除已归属到选项列的单元格图片；用于把剩余图片挂到题干 */
	public List<byte[]> imagesOfRowExcept(String sheetName, Integer rowNum, Set<Integer> excludedColumns) {
		if (sheetName == null || rowNum == null) {
			return Collections.emptyList();
		}
		Map<Integer, Map<Integer, List<byte[]>>> rows = cellImages.get(sheetName);
		Map<Integer, List<byte[]>> cells = rows == null ? null : rows.get(rowNum);
		if (cells == null || cells.isEmpty()) {
			return imagesOf(sheetName, rowNum);
		}
		List<byte[]> out = new ArrayList<>();
		for (Map.Entry<Integer, List<byte[]>> entry : cells.entrySet()) {
			if (excludedColumns != null && excludedColumns.contains(entry.getKey())) {
				continue;
			}
			out.addAll(entry.getValue());
		}
		return out;
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
