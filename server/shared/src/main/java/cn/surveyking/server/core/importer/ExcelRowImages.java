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














public final class ExcelRowImages {


	public static final long MAX_IMAGE_BYTES = 2L * 1024 * 1024;


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
				}
			}
		}
		catch (Exception e) {
			warnings.add(new Warning("IMAGE_READ_FAILED", "读取 Excel 内嵌图片失败，已按无图片导入：" + describe(e)));
		}
		return new ExcelRowImages(rowImages, warnings);
	}

	/**
	 * 图片锚点是否跨行（纵向范围超过一行）。
	 *
	 * <p>
	 * Excel 的 twoCellAnchor 用「左上角单元格 + 行列偏移」「右下角单元格 + 行列偏移」描述图片位置，
	 * 一张正好填满一个单元格的图片，右下角<b>压在下一行的行线上</b>，所以
	 * {@code row2 == row1 + 1 && rowOff2 == 0} 是单行的标准写法（Excel 与 POI 都这么写），
	 * 不能简单比 {@code row1 != row2} —— 那样会把所有正常图片判成跨行、全部丢掉。
	 * 真正会挂错题的是纵向伸进下一行的图片：跨两行以上，或第二行还有偏移。
	 * @param anchor 图片锚点
	 * @return true 表示纵向超出一行，按左上角行归属不可靠
	 */
	private static boolean spansRows(ClientAnchor anchor) {
		int fromRow = anchor.getRow1();
		int toRow = anchor.getRow2();
		if (toRow <= fromRow) {

			return false;
		}

		return !(toRow == fromRow + 1 && anchor.getDy2() == 0);
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
