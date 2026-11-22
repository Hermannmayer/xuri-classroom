package cn.surveyking.server.core.importer;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.NanoIdUtils;
import cn.surveyking.server.domain.dto.SurveySchema;
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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;








public class WordQuestionParser {


	private static final Pattern HEADING = Pattern
			.compile("^\\s*(?:[一二三四五六七八九十]+\\s*[、.．]|[（(]\\s*[一二三四五六七八九十]+\\s*[）)]).*$");

	private static final int MAX_IMAGES = 50;

	private static final long MAX_IMAGE_BYTES = 2L * 1024 * 1024;

	private final MultipartFile file;

	public WordQuestionParser(MultipartFile file) {
		this.file = file;
	}

	public ImportPreview parse() {
		if (file == null || file.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请上传 Word 文件");
		}
		List<String> lines = new ArrayList<>();
		Map<String, byte[]> attachments = new LinkedHashMap<>();
		int[] imageSeq = { 0 };
		int[] skippedImages = { 0 };
		int formulas = 0;
		try (XWPFDocument doc = new XWPFDocument(file.getInputStream())) {
			for (IBodyElement element : doc.getBodyElements()) {
				if (element instanceof XWPFParagraph) {
					XWPFParagraph paragraph = (XWPFParagraph) element;
					StringBuilder text = new StringBuilder(paragraph.getText() == null ? "" : paragraph.getText());
					for (XWPFRun run : paragraph.getRuns()) {
						for (XWPFPicture picture : run.getEmbeddedPictures()) {
							XWPFPictureData data = picture.getPictureData();
							if (data == null || data.getData() == null || data.getData().length == 0) {
								continue;
							}
							String ext = data.suggestFileExtension() == null ? "" : data.suggestFileExtension().toLowerCase();
							if (!Arrays.asList("png", "jpg", "jpeg", "gif", "bmp").contains(ext)) {
								continue;
							}
							if (imageSeq[0] >= MAX_IMAGES || data.getData().length > MAX_IMAGE_BYTES) {
								skippedImages[0] += 1;
								continue;
							}
							String token = "[[IMG:" + (++imageSeq[0]) + "]]";
							attachments.put(token, data.getData());
							if (text.length() > 0) {
								text.append(' ');
							}
							text.append(token);
						}
						if (containsFormula(run)) {
							formulas++;
						}
					}
					String paragraphText = text.toString().trim();
					if (paragraphText.matches("(\\[\\[IMG:\\d+\\]\\]\\s*)+") && !lines.isEmpty()) {

						int last = lines.size() - 1;
						lines.set(last, (lines.get(last) + " " + paragraphText).trim());
					}
					else {
						lines.add(text.toString());
					}
				}
				else if (element instanceof XWPFTable) {
					appendTable(lines, (XWPFTable) element);
				}
			}
		}
		catch (ErrorCodeException e) {
			throw e;
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					"Word 解析失败：" + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
		}

		return buildPreview(lines, attachments, formulas, skippedImages[0]);
	}

	/** 解析结果：按「一、二、三」大题标题切段后的题目树、扁平题目与解析警告 */
	public record Sectioned(String title, SurveySchema tree, List<SurveySchema> flat,
			List<ImportPreview.Warning> warnings) {
	}

	/** 按大题标题切段并逐段解析为题目；标题识别与「导入说明」跳过规则与 Word 导入一致 */
	public static Sectioned parseSections(List<String> lines) {
		List<ImportPreview.Warning> warnings = new ArrayList<>();
		List<SurveySchema> flat = new ArrayList<>();
		if (lines == null || lines.isEmpty()) {
			return new Sectioned(null, buildTree(null, new ArrayList<>(), new HashSet<>()), flat, warnings);
		}
		int firstHeading = -1;
		for (int i = 0; i < lines.size(); i++) {
			if (HEADING.matcher(lines.get(i).trim()).matches()) {
				firstHeading = i;
				break;
			}
		}
		int start = 0;
		if (firstHeading > 0) {
			String head = String.join("\n", lines.subList(0, firstHeading));
			if (head.contains("导入说明") || head.contains("请删除")) {
				start = firstHeading;
			}
		}
		String title = null;
		int cursor = start;
		while (cursor < lines.size() && !StringUtils.hasText(lines.get(cursor))) {
			cursor++;
		}
		if (cursor < lines.size()) {
			String candidate = lines.get(cursor).trim();
			if (!HEADING.matcher(candidate).matches() && TextQuestionParser.looksLikeTitle(candidate)) {
				title = candidate;
				start = cursor + 1;
			}
		}
		List<SurveySchema> children = new ArrayList<>();
		Set<String> ids = new HashSet<>();
		String currentHeading = null;
		List<String> buffer = new ArrayList<>();
		for (int i = start; i < lines.size(); i++) {
			String line = lines.get(i);
			if (HEADING.matcher(line.trim()).matches()) {
				flushSection(currentHeading, buffer, children, flat, ids, warnings);
				currentHeading = line.trim();
				buffer = new ArrayList<>();
				continue;
			}
			buffer.add(line);
		}
		flushSection(currentHeading, buffer, children, flat, ids, warnings);
		return new Sectioned(title, buildTree(title, children, ids), flat, warnings);
	}

	private static SurveySchema buildTree(String title, List<SurveySchema> children, Set<String> ids) {
		return SurveySchema.builder().id(NanoIdUtils.randomNanoId(6, ids)).type(SurveySchema.QuestionType.Survey)
				.title(title).children(children).build();
	}

	private static void flushSection(String heading, List<String> buffer, List<SurveySchema> children,
			List<SurveySchema> flat, Set<String> ids, List<ImportPreview.Warning> warnings) {
		if (buffer.isEmpty()) {
			return;
		}
		String text = String.join("\n", buffer);
		if (!StringUtils.hasText(text)) {
			return;
		}
		ImportPreview section = new TextQuestionParser(text, false).parse();
		if (section.getFlat().isEmpty()) {
			return;
		}
		warnings.addAll(section.getWarnings());
		for (SurveySchema question : section.getFlat()) {
			if (!StringUtils.hasText(question.getChapter()) && StringUtils.hasText(heading)) {
				question.setChapter(heading);
			}
		}
		flat.addAll(section.getFlat());
		if (StringUtils.hasText(heading)) {
			children.add(SurveySchema.builder().id(NanoIdUtils.randomNanoId(6, ids))
					.type(SurveySchema.QuestionType.QuestionSet).title(heading)
					.attribute(SurveySchema.Attribute.builder().build())
					.children(new ArrayList<>(section.getFlat())).build());
		}
		else {
			children.addAll(section.getFlat());
		}
	}

	private ImportPreview buildPreview(List<String> lines, Map<String, byte[]> attachments, int formulas,
			int skippedImages) {
		Sectioned sectioned = parseSections(lines);
		if (sectioned.flat().isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					"没有识别到题目：请按模板用「一、二、三」写大题、用「1. 2.」写小题");
		}
		Map<String, Integer> byType = new LinkedHashMap<>();
		double score = 0;
		for (SurveySchema item : sectioned.flat()) {
			byType.merge(item.getType().name(), 1, Integer::sum);
			Double itemScore = item.getAttribute() == null ? null : item.getAttribute().getExamScore();
			score += itemScore == null ? 0 : itemScore;
		}

		List<ImportPreview.Warning> warnings = new ArrayList<>(sectioned.warnings());
		if (!attachments.isEmpty()) {
			warnings.add(ImportPreview.Warning.builder().level("info").code("IMAGE_IMPORTED")
					.message("已提取 " + attachments.size() + " 张图片，导入后随题干展示").build());
		}
		if (skippedImages > 0) {
			warnings.add(ImportPreview.Warning.builder().level("warn").code("IMAGE_SKIPPED")
					.message("已跳过 " + skippedImages + " 张图片（单张超过 2MB 或整份超过 " + MAX_IMAGES + " 张）").build());
		}
		if (formulas > 0) {
			warnings.add(ImportPreview.Warning.builder().level("warn").code("FORMULA_SKIPPED")
					.message("已跳过 " + formulas + " 个公式（建议导入后用公式编辑器补充）").build());
		}

		return ImportPreview.builder().title(sectioned.title()).tree(sectioned.tree()).flat(sectioned.flat())
				.attachments(attachments)
				.stats(ImportPreview.Stats.builder().total(sectioned.flat().size()).score(score)
						.groups(sectioned.tree().getChildren().size()).byType(byType).build())
				.warnings(warnings).build();
	}

	private void flush(String heading, List<String> buffer, List<SurveySchema> treeChildren, List<SurveySchema> flat,
			Set<String> ids) {
		if (buffer.isEmpty()) {
			return;
		}
		String text = String.join("\n", buffer);
		if (!StringUtils.hasText(text)) {
			return;
		}
		ImportPreview section = new TextQuestionParser(text, false).parse();
		if (section.getFlat().isEmpty()) {
			return;
		}
		for (SurveySchema question : section.getFlat()) {
			if (!StringUtils.hasText(question.getChapter()) && StringUtils.hasText(heading)) {
				question.setChapter(heading);
			}
		}
		flat.addAll(section.getFlat());
		if (StringUtils.hasText(heading)) {
			SurveySchema group = SurveySchema.builder().id(NanoIdUtils.randomNanoId(6, ids))
					.type(SurveySchema.QuestionType.QuestionSet).title(heading)
					.attribute(SurveySchema.Attribute.builder().build())
					.children(new ArrayList<>(section.getFlat())).build();
			treeChildren.add(group);
		}
		else {
			treeChildren.addAll(section.getFlat());
		}
	}

	private boolean containsFormula(XWPFRun run) {
		try {
			String xml = run.getCTR().xmlText();
			return xml != null && (xml.contains("oMath") || xml.contains("m:oMath"));
		}
		catch (Exception e) {
			return false;
		}
	}

	private void appendTable(List<String> lines, XWPFTable table) {
		for (XWPFTableRow row : table.getRows()) {
			StringBuilder rowText = new StringBuilder();
			for (XWPFTableCell cell : row.getTableCells()) {
				if (rowText.length() > 0) {
					rowText.append(' ');
				}
				rowText.append(cell.getText() == null ? "" : cell.getText().trim());
			}
			lines.add(rowText.toString());
		}
		lines.add("");
	}

}
