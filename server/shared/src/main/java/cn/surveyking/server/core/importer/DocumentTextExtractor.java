/** 从导入文件里抽纯文本与图片，只在内存里读，不落盘。 */
package cn.surveyking.server.core.importer;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFPicture;
import org.apache.poi.xwpf.usermodel.XWPFPictureData;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * 从导入向导上传的文档里抽取纯文本与图片（只在内存里读，不落盘）。
 */
public final class DocumentTextExtractor {

	public static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

	public static final int MAX_TEXT_LENGTH = 200_000;

	private static final int MAX_SHEETS = 30;

	private static final int MAX_ROWS_PER_SHEET = 2_000;

	private static final int MAX_PDF_PAGES = 200;

	private static final int MAX_PDF_IMAGE_PAGES = 20;

	private static final int MIN_PDF_TEXT_CHARS = 200;

	private static final float PDF_RENDER_DPI = 120F;

	private static final Charset GB18030 = Charset.forName("GB18030");

	private static final byte[] ZIP_HEADER = { 'P', 'K' };

	private static final byte[] PDF_HEADER = { '%', 'P', 'D', 'F' };

	private static final byte[] OLE2_HEADER = { (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1,
			0x1A, (byte) 0xE1 };

	private static final byte[] PNG_HEADER = { (byte) 0x89, 'P', 'N', 'G' };

	private static final byte[] JPEG_HEADER = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF };

	private DocumentTextExtractor() {
	}

	/** 读取上传文件，返回抽取后的文本与图片；格式不支持、文件损坏或读不到文字时抛中文错误 */
	public static Extracted extract(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请上传要导入的文件");
		}
		if (file.getSize() > MAX_FILE_SIZE) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "文件超过 10MB 限制");
		}
		String fileName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().trim();
		String extension = extensionOf(fileName);
		byte[] bytes;
		try {
			bytes = file.getBytes();
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "读取上传文件失败，请重新上传");
		}
		if (bytes.length == 0) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "文件是空的，请重新上传");
		}
		Extracted extracted = switch (extension) {
			case "docx" -> docx(bytes);
			case "pdf" -> pdf(bytes);
			case "xlsx" -> xlsx(bytes, false);
			case "xls" -> xlsx(bytes, true);
			case "txt", "md", "csv" -> text(bytes);
			case "png", "jpg", "jpeg" -> image(bytes);
			case "doc" -> throw new ErrorCodeException(ErrorCode.FileParseError,
					"暂不支持 .doc 旧格式，请在 Word 里另存为 .docx 后重试");
			case "docm" -> throw new ErrorCodeException(ErrorCode.FileParseError,
					"暂不支持 .docm 宏文档，请在 Word 里另存为 .docx 后重试");
			case "xlsm" -> throw new ErrorCodeException(ErrorCode.FileParseError,
					"暂不支持 .xlsm 宏工作簿，请在 Excel 里另存为 .xlsx 后重试");
			default -> throw new ErrorCodeException(ErrorCode.FileParseError,
					"只支持 .docx / .pdf / .xlsx / .xls / .txt / .md / .csv 与 png / jpg / jpeg 图片");
		};
		extracted.setText(normalize(extracted.getText()));
		applyTextLimit(extracted);
		if (!StringUtils.hasText(extracted.getText()) && extracted.getImages().isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, emptyMessage(extension));
		}
		return extracted;
	}

	/** 文件扩展名（小写，不含点）；没有扩展名时返回空串 */
	public static String extensionOf(String fileName) {
		if (!StringUtils.hasText(fileName)) {
			return "";
		}
		int dot = fileName.lastIndexOf('.');
		if (dot < 0 || dot == fileName.length() - 1) {
			return "";
		}
		return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
	}

	/** 去掉扩展名的文件名（用于没有标题时兜底） */
	public static String baseNameOf(String fileName) {
		if (!StringUtils.hasText(fileName)) {
			return "";
		}
		String name = fileName.trim();
		int dot = name.lastIndexOf('.');
		return dot <= 0 ? name : name.substring(0, dot);
	}

	private static Extracted docx(byte[] bytes) {
		requireHeader(bytes, ZIP_HEADER,
				"文件内容不是有效的 Word 文档（.docx 文件头应以 PK 开头），请确认文件没有损坏或扩展名没有被改过");
		List<String> lines = new ArrayList<>();
		List<ExtractedImage> images = new ArrayList<>();
		try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
			List<XWPFPictureData> pictures = document.getAllPictures() == null ? List.of()
					: document.getAllPictures();
			boolean[] used = new boolean[pictures.size()];
			String lastText = "";
			for (IBodyElement element : document.getBodyElements()) {
				if (element instanceof XWPFParagraph paragraph) {
					String paragraphText = paragraph.getText() == null ? "" : paragraph.getText();
					lines.add(paragraphText);
					if (StringUtils.hasText(paragraphText)) {
						lastText = paragraphText.trim();
					}
					collectPictures(paragraph, StringUtils.hasText(paragraphText) ? paragraphText.trim() : lastText,
							pictures, used, images);
				}
				else if (element instanceof XWPFTable table) {
					appendTable(lines, table, pictures, used, images);
				}
			}
			for (int i = 0; i < pictures.size(); i++) {
				if (used[i]) {
					continue;
				}
				XWPFPictureData data = pictures.get(i);
				if (data == null || data.getData() == null || data.getData().length == 0) {
					continue;
				}
				images.add(ExtractedImage.builder().data(data.getData()).context("").build());
			}
			return build(String.join("\n", lines), new ArrayList<>(), 0, images);
		}
		catch (ErrorCodeException e) {
			throw e;
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "Word 解析失败：" + describe(e));
		}
	}

	private static void appendTable(List<String> lines, XWPFTable table, List<XWPFPictureData> pictures,
			boolean[] used, List<ExtractedImage> images) {
		for (XWPFTableRow row : table.getRows()) {
			StringBuilder rowText = new StringBuilder();
			for (XWPFTableCell cell : row.getTableCells()) {
				if (rowText.length() > 0) {
					rowText.append(" | ");
				}
				String cellText = cell.getText() == null ? "" : cell.getText().trim();
				rowText.append(cellText);
				for (XWPFParagraph paragraph : cell.getParagraphs()) {
					collectPictures(paragraph, cellText, pictures, used, images);
				}
			}
			lines.add(rowText.toString());
		}
		lines.add("");
	}

	private static void collectPictures(XWPFParagraph paragraph, String context, List<XWPFPictureData> pictures,
			boolean[] used, List<ExtractedImage> images) {
		if (paragraph == null) {
			return;
		}
		for (XWPFRun run : paragraph.getRuns()) {
			for (XWPFPicture picture : run.getEmbeddedPictures()) {
				XWPFPictureData data = picture.getPictureData();
				if (data == null || data.getData() == null || data.getData().length == 0) {
					continue;
				}
				int index = indexOf(pictures, data);
				if (index < 0 || used[index]) {
					continue;
				}
				used[index] = true;
				images.add(ExtractedImage.builder().data(data.getData()).context(context == null ? "" : context).build());
			}
		}
	}

	private static int indexOf(List<XWPFPictureData> pictures, XWPFPictureData target) {
		for (int i = 0; i < pictures.size(); i++) {
			if (pictures.get(i) == target) {
				return i;
			}
		}
		return -1;
	}

	private static Extracted xlsx(byte[] bytes, boolean legacy) {
		requireHeader(bytes, legacy ? OLE2_HEADER : ZIP_HEADER, legacy
				? "文件内容不是有效的 Excel 工作簿（.xls 文件头应以 D0CF 开头），请确认文件没有损坏或扩展名没有被改过"
				: "文件内容不是有效的 Excel 工作簿（.xlsx 文件头应以 PK 开头），请确认文件没有损坏或扩展名没有被改过");
		List<ImportPreview.Warning> warnings = new ArrayList<>();
		List<String> lines = new ArrayList<>();
		List<ExtractedImage> images = new ArrayList<>();
		Map<String, Map<Integer, String>> rowTexts = new LinkedHashMap<>();
		try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
			DataFormatter formatter = new DataFormatter();
			int sheetCount = workbook.getNumberOfSheets();
			int sheetLimit = Math.min(sheetCount, MAX_SHEETS);
			ExcelRowImages rowImages = legacy ? ExcelRowImages.empty() : ExcelRowImages.read(bytes);
			for (ImportPreview.Warning warning : toPreviewWarnings(rowImages.getWarnings())) {
				warnings.add(warning);
			}
			for (int index = 0; index < sheetLimit; index++) {
				Sheet sheet = workbook.getSheetAt(index);
				String sheetName = sheet.getSheetName() == null ? "" : sheet.getSheetName();
				Map<Integer, String> rows = new TreeMap<>();
				rowTexts.put(sheetName, rows);
				int lastRow = sheet.getLastRowNum();
				int rowLimit = Math.min(lastRow, MAX_ROWS_PER_SHEET - 1);
				for (int rowIndex = 0; rowIndex <= rowLimit; rowIndex++) {
					String text = rowText(sheet.getRow(rowIndex), formatter);
					if (!StringUtils.hasText(text)) {
						continue;
					}
					lines.add(text);
					rows.put(rowIndex + 1, text);
				}
				if (lastRow + 1 > MAX_ROWS_PER_SHEET) {
					warnings.add(warning("EXCEL_ROW_LIMIT", "工作表「" + sheetName + "」超过 " + MAX_ROWS_PER_SHEET
							+ " 行，只读取了前 " + MAX_ROWS_PER_SHEET + " 行"));
				}
				lines.add("");
				if (!legacy) {
					collectRowImages(rowImages, sheetName, lastRow, rows, images);
				}
			}
			if (sheetCount > MAX_SHEETS) {
				warnings.add(warning("EXCEL_SHEET_LIMIT",
						"工作簿共 " + sheetCount + " 个工作表，只读取了前 " + MAX_SHEETS + " 个"));
			}
			if (legacy && hasLegacyPictures(workbook)) {
				warnings.add(warning("IMAGE_UNSUPPORTED",
						"旧格式 .xls 的内嵌图片暂不支持，请另存为 .xlsx 后重试（文字部分已正常读取）"));
			}
			return build(String.join("\n", lines), warnings, sheetCount, images);
		}
		catch (EncryptedDocumentException e) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "Excel 有密码，无法读取");
		}
		catch (ErrorCodeException e) {
			throw e;
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "Excel 解析失败：" + describe(e));
		}
	}

	private static String rowText(Row row, DataFormatter formatter) {
		if (row == null) {
			return "";
		}
		StringBuilder text = new StringBuilder();
		short lastCell = row.getLastCellNum();
		for (int i = 0; i < lastCell; i++) {
			Cell cell = row.getCell(i);
			String value = cell == null ? "" : formatter.formatCellValue(cell);
			value = value == null ? "" : value.replace("\r", " ").replace("\n", " ").trim();
			if (!StringUtils.hasText(value)) {
				continue;
			}
			if (text.length() > 0) {
				text.append('\t');
			}
			text.append(value);
		}
		return text.toString();
	}

	private static void collectRowImages(ExcelRowImages rowImages, String sheetName, int lastRow,
			Map<Integer, String> rows, List<ExtractedImage> images) {
		if (rowImages.isEmpty()) {
			return;
		}
		for (int rowNum = 1; rowNum <= lastRow + 1; rowNum++) {
			for (byte[] data : rowImages.imagesOf(sheetName, rowNum)) {
				String context = rows.get(rowNum);
				images.add(ExtractedImage.builder().data(data)
						.context(StringUtils.hasText(context) ? context : sheetName).build());
			}
		}
	}

	private static boolean hasLegacyPictures(Workbook workbook) {
		if (!(workbook instanceof HSSFWorkbook legacy)) {
			return false;
		}
		try {
			return legacy.getAllPictures() != null && !legacy.getAllPictures().isEmpty();
		}
		catch (Exception e) {
			return false;
		}
	}

	private static Extracted pdf(byte[] bytes) {
		requireHeader(bytes, PDF_HEADER, "文件内容不是有效的 PDF（文件头应为 %PDF），请确认文件没有损坏");
		List<ImportPreview.Warning> warnings = new ArrayList<>();
		List<ExtractedImage> images = new ArrayList<>();
		try (PDDocument document = Loader.loadPDF(bytes)) {
			int pageCount = document.getNumberOfPages();
			int pageLimit = Math.min(pageCount, MAX_PDF_PAGES);
			StringBuilder text = new StringBuilder();
			PDFTextStripper stripper = new PDFTextStripper();
			stripper.setSortByPosition(true);
			PDFRenderer renderer = pageCount > 0 ? new PDFRenderer(document) : null;
			for (int page = 1; page <= pageLimit; page++) {
				stripper.setStartPage(page);
				stripper.setEndPage(page);
				String pageText = stripper.getText(document);
				text.append(pageText == null ? "" : pageText).append("\n\n");
				if (images.size() >= MAX_PDF_IMAGE_PAGES || renderer == null) {
					continue;
				}
				PDPage pdfPage = document.getPage(page - 1);
				if (plainLength(pageText) >= MIN_PDF_TEXT_CHARS && !hasImageObject(pdfPage)) {
					continue;
				}
				byte[] jpeg = renderPage(renderer, page - 1);
				if (jpeg == null) {
					warnings.add(warning("PDF_RENDER_FAILED", "PDF 第 " + page + " 页渲染失败，已跳过该页图片"));
					continue;
				}
				if (images.size() == 0) {
					warnings.add(warning("PDF_PAGE_IMAGES", "PDF 里可渲染的页面会按整页截图发送给 AI 识别题目"));
				}
				images.add(ExtractedImage.builder().data(jpeg).context(trimContext(pageText)).build());
			}
			if (pageCount > MAX_PDF_PAGES) {
				warnings.add(warning("PDF_PAGE_LIMIT",
						"PDF 共 " + pageCount + " 页，只读取了前 " + MAX_PDF_PAGES + " 页"));
			}
			if (pageLimit > MAX_PDF_IMAGE_PAGES && images.size() >= MAX_PDF_IMAGE_PAGES) {
				warnings.add(warning("PDF_IMAGE_PAGE_LIMIT",
						"PDF 图片只识别了前 " + MAX_PDF_IMAGE_PAGES + " 页，其余页面的图片没有发送给 AI"));
			}
			return build(text.toString(), warnings, pageCount, images);
		}
		catch (InvalidPasswordException e) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "PDF 有密码，无法读取");
		}
		catch (ErrorCodeException e) {
			throw e;
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "PDF 解析失败：" + describe(e));
		}
	}

	private static boolean hasImageObject(PDPage page) {
		PDResources resources = page == null ? null : page.getResources();
		if (resources == null) {
			return false;
		}
		try {
			for (COSName name : resources.getXObjectNames()) {
				PDXObject xObject = resources.getXObject(name);
				if (xObject instanceof PDImageXObject) {
					return true;
				}
			}
		}
		catch (Exception e) {
			return false;
		}
		return false;
	}

	private static byte[] renderPage(PDFRenderer renderer, int pageIndex) {
		try {
			BufferedImage image = renderer.renderImageWithDPI(pageIndex, PDF_RENDER_DPI, ImageType.RGB);
			ByteArrayOutputStream out = new ByteArrayOutputStream(256 * 1024);
			if (!ImageIO.write(image, "jpg", out)) {
				return null;
			}
			return out.toByteArray();
		}
		catch (Exception e) {
			return null;
		}
	}

	private static Extracted text(byte[] bytes) {
		if (startsWith(bytes, ZIP_HEADER) || startsWith(bytes, OLE2_HEADER) || startsWith(bytes, PDF_HEADER)) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					"文件内容不是纯文本，请按实际格式（.docx / .xlsx / .pdf）重新上传");
		}
		if (containsNul(bytes)) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					"文件看起来是二进制文件，不是纯文本；请换用 .docx / .pdf / .xlsx 导入");
		}
		return build(decode(bytes), new ArrayList<>(), 0, List.of());
	}

	private static Extracted image(byte[] bytes) {
		if (!startsWith(bytes, PNG_HEADER) && !startsWith(bytes, JPEG_HEADER)) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "文件内容不是有效的图片，只支持 png / jpg / jpeg");
		}
		return build("", new ArrayList<>(), 1, List.of(ExtractedImage.builder().data(bytes).context("").build()));
	}

	private static Extracted build(String text, List<ImportPreview.Warning> warnings, int pagesOrSheets,
			List<ExtractedImage> images) {
		List<ExtractedImage> collected = new ArrayList<>();
		for (ExtractedImage image : images) {
			if (image == null || image.getData() == null || image.getData().length == 0) {
				continue;
			}
			image.setIndex(collected.size() + 1);
			collected.add(image);
		}
		return Extracted.builder().text(text == null ? "" : text).warnings(warnings)
				.pagesOrSheets(pagesOrSheets).hasImages(!collected.isEmpty()).images(collected).build();
	}

	private static String decode(byte[] bytes) {
		byte[] payload = bytes;
		if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xEF && (bytes[1] & 0xFF) == 0xBB && (bytes[2] & 0xFF) == 0xBF) {
			payload = Arrays.copyOfRange(bytes, 3, bytes.length);
		}
		String utf8 = decodeStrict(payload, StandardCharsets.UTF_8);
		if (utf8 != null) {
			return utf8;
		}
		String gb18030 = decodeStrict(payload, GB18030);
		return gb18030 != null ? gb18030 : new String(payload, GB18030);
	}

	private static String decodeStrict(byte[] bytes, Charset charset) {
		try {
			return charset.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
					.onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
		}
		catch (CharacterCodingException e) {
			return null;
		}
	}

	private static boolean containsNul(byte[] bytes) {
		for (byte value : bytes) {
			if (value == 0) {
				return true;
			}
		}
		return false;
	}

	private static void requireHeader(byte[] bytes, byte[] header, String message) {
		if (!startsWith(bytes, header)) {
			throw new ErrorCodeException(ErrorCode.FileParseError, message);
		}
	}

	private static boolean startsWith(byte[] bytes, byte[] header) {
		if (bytes == null || bytes.length < header.length) {
			return false;
		}
		for (int i = 0; i < header.length; i++) {
			if (bytes[i] != header[i]) {
				return false;
			}
		}
		return true;
	}

	private static String normalize(String text) {
		if (text == null) {
			return "";
		}
		return text.replace("\r\n", "\n").replace('\r', '\n').replace("\uFEFF", "");
	}

	private static void applyTextLimit(Extracted extracted) {
		String text = extracted.getText();
		if (text != null && text.length() > MAX_TEXT_LENGTH) {
			extracted.setText(text.substring(0, MAX_TEXT_LENGTH));
			extracted.getWarnings().add(warning("TEXT_TRUNCATED", "文档过长，只读取了前 " + MAX_TEXT_LENGTH + " 字"));
		}
	}

	private static int plainLength(String text) {
		return text == null ? 0 : text.replaceAll("\\s", "").length();
	}

	private static String trimContext(String text) {
		if (!StringUtils.hasText(text)) {
			return "";
		}
		String value = text.replaceAll("\\s+", " ").trim();
		return value.length() <= 500 ? value : value.substring(0, 500);
	}

	private static String emptyMessage(String extension) {
		if ("pdf".equals(extension)) {
			return "没有从 PDF 里读到文字：扫描版 PDF 请先转成可复制文字的 PDF，或把页面截成图片后按图片导入";
		}
		return "没有从文件里读到文字，请确认文件内容不为空（表格与正文都需要有内容）";
	}

	private static List<ImportPreview.Warning> toPreviewWarnings(List<ExcelRowImages.Warning> source) {
		List<ImportPreview.Warning> warnings = new ArrayList<>();
		for (ExcelRowImages.Warning warning : source) {
			warnings.add(warning(warning.getCode(), warning.getMessage()));
		}
		return warnings;
	}

	private static ImportPreview.Warning warning(String code, String message) {
		return ImportPreview.Warning.builder().level("warn").code(code).message(message).build();
	}

	private static String describe(Throwable e) {
		if (e == null) {
			return "未知错误";
		}
		String message = e.getMessage();
		if (!StringUtils.hasText(message)) {
			return e.getClass().getSimpleName();
		}
		return message.length() > 200 ? message.substring(0, 200) + "…" : message;
	}

	/** 抽取结果：纯文本、图片（按文档顺序从 1 编号）、页数/工作表数与警告 */
	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class Extracted {

		private String text;

		@Builder.Default
		private List<ImportPreview.Warning> warnings = new ArrayList<>();

		private int pagesOrSheets;

		private boolean hasImages;

		@Builder.Default
		private List<ExtractedImage> images = new ArrayList<>();

	}

	/** 抽取到的图片：原始字节、从 1 开始的编号与附近文字（提示词里只带编号与文字，不带图片内容） */
	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ExtractedImage {

		private byte[] data;

		private int index;

		private String context;

	}

}
