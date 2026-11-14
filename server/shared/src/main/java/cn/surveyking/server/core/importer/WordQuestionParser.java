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

/**
 * Word（.docx）试卷解析：按「中文数字大题标题」切题组，组内复用文本解析器识别题目。
 *
 * <p>
 * 每段的文字被拍平成行；表格按单元格逐行展开。图片与公式本版本只计数并给出提示，
 * 不写入题干（富题干在后续版本补）。
 */
public class WordQuestionParser {

	/** 一、xxx / （一）xxx / (一) xxx */
	private static final Pattern HEADING = Pattern
			.compile("^\\s*(?:[一二三四五六七八九十]+\\s*[、.．]|[（(]\\s*[一二三四五六七八九十]+\\s*[）)]).*$");

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
						// 图片常常单独占一段：并回上一行，别让它变成“选项”
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

		return buildPreview(lines, attachments, formulas);
	}

	private ImportPreview buildPreview(List<String> lines, Map<String, byte[]> attachments, int formulas) {
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
				// 模板顶部的使用说明整段跳过
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

		List<SurveySchema> treeChildren = new ArrayList<>();
		List<SurveySchema> flat = new ArrayList<>();
		Set<String> ids = new HashSet<>();
		String currentHeading = null;
		List<String> buffer = new ArrayList<>();

		for (int i = start; i < lines.size(); i++) {
			String line = lines.get(i);
			if (HEADING.matcher(line.trim()).matches()) {
				flush(currentHeading, buffer, treeChildren, flat, ids);
				currentHeading = line.trim();
				buffer = new ArrayList<>();
				continue;
			}
			buffer.add(line);
		}
		flush(currentHeading, buffer, treeChildren, flat, ids);

		if (flat.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					"没有识别到题目：请按模板用「一、二、三」写大题、用「1. 2.」写小题");
		}

		SurveySchema tree = SurveySchema.builder().id(NanoIdUtils.randomNanoId(6, ids))
				.type(SurveySchema.QuestionType.Survey).title(title).children(treeChildren).build();

		Map<String, Integer> byType = new LinkedHashMap<>();
		double score = 0;
		for (SurveySchema item : flat) {
			byType.merge(item.getType().name(), 1, Integer::sum);
			Double itemScore = item.getAttribute() == null ? null : item.getAttribute().getExamScore();
			score += itemScore == null ? 0 : itemScore;
		}

		List<ImportPreview.Warning> warnings = new ArrayList<>();
		if (!attachments.isEmpty()) {
			warnings.add(ImportPreview.Warning.builder().level("info").code("IMAGE_IMPORTED")
					.message("已提取 " + attachments.size() + " 张图片，导入后随题干展示").build());
		}
		if (formulas > 0) {
			warnings.add(ImportPreview.Warning.builder().level("warn").code("FORMULA_SKIPPED")
					.message("已跳过 " + formulas + " 个公式（建议导入后用公式编辑器补充）").build());
		}

		return ImportPreview.builder().title(title).tree(tree).flat(flat).attachments(attachments)
				.stats(ImportPreview.Stats.builder().total(flat.size()).score(score).groups(treeChildren.size())
						.byType(byType).build())
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
