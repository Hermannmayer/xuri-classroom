package cn.surveyking.server.impl;

import cn.surveyking.server.core.uitls.RepoTemplateI18n;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Template;
import org.dhatim.fastexcel.Workbook;
import org.dhatim.fastexcel.Worksheet;
import org.springframework.util.StringUtils;
import tools.jackson.databind.json.JsonMapper;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

















final class RepoQuestionExcelExporter {


	private static final List<String> OPTION_SUFFIXES = Arrays.asList("A", "B", "C", "D", "E", "F", "G", "H");


	private static final List<String> BLANK_INDEXES = Arrays.asList("1", "2", "3", "4", "5", "6", "7", "8");


	private static final int MAX_MATRIX_TITLE_INDEX = 10;








	static final List<SurveySchema.QuestionType> EXPORTABLE_TYPES = Arrays.asList(SurveySchema.QuestionType.Radio,
			SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Judge, SurveySchema.QuestionType.FillBlank,
			SurveySchema.QuestionType.MultipleBlank, SurveySchema.QuestionType.Textarea,
			SurveySchema.QuestionType.Select, SurveySchema.QuestionType.Score, SurveySchema.QuestionType.Nps,
			SurveySchema.QuestionType.Cascader, SurveySchema.QuestionType.MatrixRadio,
			SurveySchema.QuestionType.MatrixCheckbox, SurveySchema.QuestionType.MatrixFillBlank,
			SurveySchema.QuestionType.Upload);


	private static final JsonMapper JSON = JsonMapper.builder().build();

	private RepoQuestionExcelExporter() {
	}

	/**
	 * 按题型分 sheet 写出 xlsx 字节；空题型不建 sheet，写出顺序固定为
	 * 单选 → 多选 → 判断 → 填空 → 简答 → 下拉 → 评分 → NPS → 级联 → 矩阵单选 → 矩阵多选 → 上传 → 矩阵填空
	 * （即 {@link RepoTemplateI18n.SheetType} 的声明顺序，与导入模板一致）。
	 * @param questions 题库里的题目（{@code template} 为空的行会被跳过）
	 * @return xlsx 字节
	 */
	static byte[] export(List<Template> questions) {
		Map<RepoTemplateI18n.SheetType, List<List<Object>>> rowsBySheet = buildRows(questions);
		if (rowsBySheet.isEmpty()) {
			throw new IllegalStateException("没有可导出的题目");
		}
		try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			Workbook workbook = new Workbook(out, RepoTemplateI18n.workbookName(), "1.0");
			for (RepoTemplateI18n.SheetType sheetType : RepoTemplateI18n.SheetType.values()) {
				List<List<Object>> rows = rowsBySheet.get(sheetType);
				if (rows == null || rows.isEmpty()) {
					continue;
				}
				writeSheet(workbook, sheetType, headersOf(sheetType), rows);
			}
			workbook.finish();
			return normalizeZip(out.toByteArray());
		}
		catch (IOException e) {

			throw new IllegalStateException("导出 Excel 失败：" + e.getMessage(), e);
		}
	}

	/**
	 * 把 fastexcel 产出的 zip 按中央目录重写一遍。
	 *
	 * <p>
	 * 实测 fastexcel 0.20.2 写出的每个条目：本地头 csize/size 都是 0、flag 置了 bit3（数据描述符），
	 * 而描述符里的<b>未压缩长度恒为 0</b>（压缩长度是对的）。Excel、POI、Python zipfile 都按中央目录读，
	 * 所以看不出来；但流式读取（{@code java.util.zip.ZipInputStream}）会当场抛
	 * {@code ZipException: invalid entry size (expected 0 but got N bytes)}——而导入侧的安全校验
	 * （{@link cn.surveyking.server.core.uitls.ExcelImportSecurity}）正是流式读的。
	 *
	 * <p>
	 * 结果就是「我们自己导出的文件，我们自己导不回来」：老师导出 → 改 → 再导入会直接报「文件解析失败」。
	 * 与其放宽导入的安全校验，不如让导出产出标准 zip：代价是一个临时文件 + 一次内存拷贝，
	 * xlsx 只有几十 KB 到几 MB，跟「导出完自己导不回来」比完全值得。
	 *
	 * <p>
	 * 包级可见是给单测用的：测试里用同一套 fastexcel 造 fixture 也会有同样的毛病，不先规范化连解析都进不去。
	 */
	static byte[] normalizeZip(byte[] source) throws IOException {
		Path temp = Files.createTempFile("repo-export", ".xlsx");
		ByteArrayOutputStream out = new ByteArrayOutputStream(source.length);
		try {
			Files.write(temp, source);

			try (ZipFile zipFile = new ZipFile(temp.toFile()); ZipOutputStream zipOut = new ZipOutputStream(out)) {
				Enumeration<? extends ZipEntry> entries = zipFile.entries();
				while (entries.hasMoreElements()) {
					ZipEntry entry = entries.nextElement();
					if (entry.isDirectory()) {
						continue;
					}
					zipOut.putNextEntry(new ZipEntry(entry.getName()));
					try (InputStream in = zipFile.getInputStream(entry)) {
						in.transferTo(zipOut);
					}
					zipOut.closeEntry();
				}
			}
			return out.toByteArray();
		}
		finally {
			Files.deleteIfExists(temp);
		}
	}

	// ------ 组装行

	private static Map<RepoTemplateI18n.SheetType, List<List<Object>>> buildRows(List<Template> questions) {
		Map<RepoTemplateI18n.SheetType, List<List<Object>>> rowsBySheet = new EnumMap<>(
				RepoTemplateI18n.SheetType.class);
		if (questions == null) {
			return rowsBySheet;
		}
		for (Template template : questions) {
			if (template == null || template.getTemplate() == null) {
				continue;
			}
			SurveySchema schema = template.getTemplate();
			RepoTemplateI18n.SheetType sheetType = sheetTypeOf(template, schema);
			if (sheetType == null) {
				continue;
			}
			List<List<Object>> rows = rowsBySheet.computeIfAbsent(sheetType, key -> new ArrayList<>());

			rows.add(buildRow(sheetType, template, schema, rows.size() + 1));
		}
		return rowsBySheet;
	}

	/** 题型 → sheet：schema 上的 type 才代表渲染/判分方式，缺了才退回题库行的 questionType */
	private static RepoTemplateI18n.SheetType sheetTypeOf(Template template, SurveySchema schema) {
		SurveySchema.QuestionType questionType = schema.getType() != null ? schema.getType()
				: template.getQuestionType();
		return sheetTypeOf(questionType);
	}

	private static RepoTemplateI18n.SheetType sheetTypeOf(SurveySchema.QuestionType questionType) {
		if (questionType == null) {
			return null;
		}
		switch (questionType) {
			case Radio:
				return RepoTemplateI18n.SheetType.SINGLE_CHOICE;
			case Checkbox:
				return RepoTemplateI18n.SheetType.MULTIPLE_CHOICE;
			case Judge:
				return RepoTemplateI18n.SheetType.TRUE_FALSE;
			case FillBlank:
			case MultipleBlank:
				return RepoTemplateI18n.SheetType.FILL_BLANK;
			case Textarea:
				return RepoTemplateI18n.SheetType.TEXTAREA;
			case Select:
				return RepoTemplateI18n.SheetType.SELECT;
			case Score:
				return RepoTemplateI18n.SheetType.SCORE;
			case Nps:
				return RepoTemplateI18n.SheetType.NPS;
			case Cascader:
				return RepoTemplateI18n.SheetType.CASCADER;
			case MatrixRadio:
				return RepoTemplateI18n.SheetType.MATRIX_RADIO;
			case MatrixCheckbox:
				return RepoTemplateI18n.SheetType.MATRIX_CHECKBOX;
			case MatrixFillBlank:
				return RepoTemplateI18n.SheetType.MATRIX_FILL_BLANK;
			case Upload:
				return RepoTemplateI18n.SheetType.UPLOAD;
			default:
				return null;
		}
	}

	private static List<Object> buildRow(RepoTemplateI18n.SheetType sheetType, Template template, SurveySchema schema,
			int serialNo) {
		SurveySchema.Attribute attribute = schema.getAttribute() != null ? schema.getAttribute()
				: new SurveySchema.Attribute();
		List<Object> row = new ArrayList<>();
		row.add(serialNo);
		row.add(firstText(template.getChapter(), schema.getChapter()));
		row.add(nullToEmpty(schema.getTitle()));
		row.add(scoreOf(sheetType, attribute));
		row.add(firstText(template.getDifficulty(), schema.getDifficulty()));
		row.add(tagsOf(template, schema));
		row.add(nullToEmpty(attribute.getExamAnalysis()));
		row.add(answerOf(sheetType, schema, attribute));
		row.add(judgeModeOf(attribute));
		switch (sheetType) {
			case SINGLE_CHOICE:
			case MULTIPLE_CHOICE:
			case TRUE_FALSE:
			case SELECT:
				appendOptionColumns(row, schema);
				break;
			case FILL_BLANK:
				appendBlankColumns(row, schema);
				break;
			case CASCADER:
				row.add(optionTreeJson(schema.getDataSource()));
				break;
			case MATRIX_RADIO:
			case MATRIX_CHECKBOX:
			case MATRIX_FILL_BLANK:
				appendMatrixColumns(row, schema);
				break;
			default:
				break;
		}

		row.add("");
		return row;
	}

	// ------ 各题型的列

	private static void appendOptionColumns(List<Object> row, SurveySchema schema) {
		List<SurveySchema> children = schema.getChildren();
		for (int i = 0; i < OPTION_SUFFIXES.size(); i++) {
			String title = "";
			if (children != null && i < children.size() && children.get(i) != null) {
				title = nullToEmpty(children.get(i).getTitle());
			}
			row.add(title);
		}
	}

	private static void appendBlankColumns(List<Object> row, SurveySchema schema) {
		List<SurveySchema> children = schema.getChildren();
		for (int i = 0; i < BLANK_INDEXES.size(); i++) {
			String answer = "";
			if (children != null && i < children.size() && children.get(i) != null
					&& children.get(i).getAttribute() != null) {
				answer = nullToEmpty(children.get(i).getAttribute().getExamCorrectAnswer());
			}
			row.add(answer);
		}
	}

	private static void appendMatrixColumns(List<Object> row, SurveySchema schema) {
		List<String> rowTitles = matrixRowTitles(schema);
		List<String> columnTitles = matrixColumnTitles(schema);
		for (int i = 0; i < MAX_MATRIX_TITLE_INDEX; i++) {
			row.add(i < rowTitles.size() ? rowTitles.get(i) : "");
		}
		for (int i = 0; i < MAX_MATRIX_TITLE_INDEX; i++) {
			row.add(i < columnTitles.size() ? columnTitles.get(i) : "");
		}
	}

	private static List<String> matrixRowTitles(SurveySchema schema) {
		List<String> titles = new ArrayList<>();
		if (schema.getRow() != null) {
			for (SurveySchema.Row matrixRow : schema.getRow()) {
				if (matrixRow != null && StringUtils.hasText(matrixRow.getTitle())) {
					titles.add(matrixRow.getTitle().trim());
				}
			}
		}
		return titles;
	}

	/** 矩阵的列：设计器把列放在 dataSource 上（渲染也按它），历史数据可能只有 children */
	private static List<String> matrixColumnTitles(SurveySchema schema) {
		List<String> titles = new ArrayList<>();
		if (schema.getDataSource() != null) {
			for (SurveySchema.DataSource column : schema.getDataSource()) {
				if (column != null && StringUtils.hasText(column.getLabel())) {
					titles.add(column.getLabel().trim());
				}
			}
		}
		if (titles.isEmpty() && schema.getChildren() != null) {
			for (SurveySchema child : schema.getChildren()) {
				if (child != null && StringUtils.hasText(child.getTitle())) {
					titles.add(child.getTitle().trim());
				}
			}
		}
		return titles;
	}

	/** 选项树(JSON)：导入认 {"label","value","children"}，这也是唯一能表达级联层级的格式 */
	private static String optionTreeJson(List<SurveySchema.DataSource> dataSource) {
		return JSON.writeValueAsString(toNodeMaps(dataSource));
	}

	private static List<Map<String, Object>> toNodeMaps(List<SurveySchema.DataSource> nodes) {
		List<Map<String, Object>> list = new ArrayList<>();
		if (nodes == null) {
			return list;
		}
		for (SurveySchema.DataSource node : nodes) {
			if (node == null) {
				continue;
			}
			Map<String, Object> map = new LinkedHashMap<>();
			map.put("label", node.getLabel());
			map.put("value", node.getValue());
			List<Map<String, Object>> children = toNodeMaps(node.getChildren());
			if (!children.isEmpty()) {
				map.put("children", children);
			}
			list.add(map);
		}
		return list;
	}

	// ------ 答案列

	private static String answerOf(RepoTemplateI18n.SheetType sheetType, SurveySchema schema,
			SurveySchema.Attribute attribute) {
		switch (sheetType) {
			case SINGLE_CHOICE:
			case TRUE_FALSE:
			case SELECT:
				return firstCorrectOptionLetter(schema);
			case MULTIPLE_CHOICE:
				return String.join(",", correctOptionLetters(schema));
			case FILL_BLANK:

				return "";
			case TEXTAREA:
				return firstChildAnswer(schema);
			case CASCADER:
				return cascaderAnswerPath(schema, attribute);
			default:

				return nullToEmpty(attribute.getExamCorrectAnswer());
		}
	}

	private static List<String> correctOptionLetters(SurveySchema schema) {
		List<String> letters = new ArrayList<>();
		List<SurveySchema> children = schema.getChildren();
		if (children == null) {
			return letters;
		}
		for (int i = 0; i < Math.min(children.size(), OPTION_SUFFIXES.size()); i++) {
			SurveySchema child = children.get(i);
			if (child != null && child.getAttribute() != null
					&& StringUtils.hasText(child.getAttribute().getExamCorrectAnswer())) {
				letters.add(String.valueOf((char) ('A' + i)));
			}
		}
		return letters;
	}

	private static String firstCorrectOptionLetter(SurveySchema schema) {
		List<String> letters = correctOptionLetters(schema);
		return letters.isEmpty() ? "" : letters.get(0);
	}

	private static String firstChildAnswer(SurveySchema schema) {
		if (schema.getChildren() == null || schema.getChildren().isEmpty() || schema.getChildren().get(0) == null
				|| schema.getChildren().get(0).getAttribute() == null) {
			return "";
		}
		return nullToEmpty(schema.getChildren().get(0).getAttribute().getExamCorrectAnswer());
	}

	/** 级联答案只存末级 value，导出时补回整条路径（"sd/jn"），老师改起来才知道是哪一支 */
	private static String cascaderAnswerPath(SurveySchema schema, SurveySchema.Attribute attribute) {
		String leaf = attribute.getExamCorrectAnswer();
		if (!StringUtils.hasText(leaf)) {
			return "";
		}
		List<String> path = findCascaderPath(schema.getDataSource(), leaf.trim(), new ArrayList<>());
		return path == null ? leaf.trim() : String.join("/", path);
	}

	private static List<String> findCascaderPath(List<SurveySchema.DataSource> nodes, String value,
			List<String> parents) {
		if (nodes == null) {
			return null;
		}
		for (SurveySchema.DataSource node : nodes) {
			if (node == null) {
				continue;
			}
			List<String> current = new ArrayList<>(parents);
			current.add(StringUtils.hasText(node.getValue()) ? node.getValue() : nullToEmpty(node.getLabel()));
			if (value.equals(node.getValue())) {
				return current;
			}
			List<String> found = findCascaderPath(node.getChildren(), value, current);
			if (found != null) {
				return found;
			}
		}
		return null;
	}

	/**
	 * 分数列。
	 *
	 * <p>
	 * 评分题的「满星」与 NPS 的「最高分」在库里可能只存在于 {@code scope} / {@code npsTotalNum} 上
	 * （设计器建题时不一定写 {@code examScore}），而导入是拿「分数」列还原它们的——这里反推一次，

	 */
	private static Object scoreOf(RepoTemplateI18n.SheetType sheetType, SurveySchema.Attribute attribute) {
		if (attribute.getExamScore() != null) {
			return attribute.getExamScore();
		}
		if (sheetType == RepoTemplateI18n.SheetType.SCORE) {
			Integer max = scopeUpperBound(attribute.getScope());
			return max != null ? max : "";
		}
		if (sheetType == RepoTemplateI18n.SheetType.NPS && attribute.getNpsTotalNum() != null) {

			return Math.max(attribute.getNpsTotalNum() - 1, 0);
		}
		return "";
	}

	/** scope 形如 "[0,8]"：取逗号后的上界，解析不出来返回 null */
	private static Integer scopeUpperBound(String scope) {
		if (!StringUtils.hasText(scope)) {
			return null;
		}
		String text = scope.trim();
		int end = text.lastIndexOf(']');
		if (end < 0) {
			return null;
		}
		int separator = Math.max(text.lastIndexOf(',', end), text.lastIndexOf('，', end));
		try {
			return Integer.valueOf(text.substring(separator + 1, end).trim());
		}
		catch (NumberFormatException e) {
			return null;
		}
	}



	/** 章节/难度：题库行上的列优先，其次看 schema（导入时两边都写过） */
	private static String firstText(String primary, String secondary) {
		if (StringUtils.hasText(primary)) {
			return primary.trim();
		}
		if (StringUtils.hasText(secondary)) {
			return secondary.trim();
		}
		return "";
	}

	/**
	 * 标签列：优先题库的 tag 列（老导出口径），没有就退回 {@code schema.tags}。
	 *
	 * <p>导入按 {@code [s,]+} 拆，这里统一用逗号拼。
	 */
	private static String tagsOf(Template template, SurveySchema schema) {
		if (template.getTag() != null && template.getTag().length > 0) {
			String joined = Arrays.stream(template.getTag()).filter(StringUtils::hasText).map(String::trim)
					.collect(Collectors.joining(","));
			if (!joined.isEmpty()) {
				return joined;
			}
		}
		if (schema.getTags() == null || schema.getTags().isEmpty()) {
			return "";
		}
		return schema.getTags().stream().filter(StringUtils::hasText).map(String::trim).collect(Collectors.joining(","));
	}

	/** 判分模式列：只有人工评分的题写「人工」，其余留空（导入时空 = 按题型默认） */
	private static String judgeModeOf(SurveySchema.Attribute attribute) {
		return SurveySchema.ExamScoreMode.manual.equals(attribute.getExamAnswerMode()) ? "人工" : "";
	}

	private static String nullToEmpty(String value) {
		return value == null ? "" : value;
	}

	// ------ 写 sheet（13 种题型共用一套逻辑，避免复制 13 遍）

	private static List<String> headersOf(RepoTemplateI18n.SheetType sheetType) {
		List<String> headers = new ArrayList<>();
		headers.add(RepoTemplateI18n.HeaderLabel.SERIAL_NO.displayLabel());
		headers.add(RepoTemplateI18n.HeaderLabel.CHAPTER.displayLabel());
		headers.add(RepoTemplateI18n.HeaderLabel.TITLE.displayLabel());
		headers.add(RepoTemplateI18n.HeaderLabel.SCORE.displayLabel());
		headers.add(RepoTemplateI18n.HeaderLabel.DIFFICULTY.displayLabel());
		headers.add(RepoTemplateI18n.HeaderLabel.TAGS.displayLabel());
		headers.add(RepoTemplateI18n.HeaderLabel.ANALYSIS.displayLabel());
		headers.add(RepoTemplateI18n.HeaderLabel.ANSWER.displayLabel());

		headers.add(RepoTemplateI18n.HeaderLabel.JUDGE_MODE.displayLabel());
		switch (sheetType) {
			case SINGLE_CHOICE:
			case MULTIPLE_CHOICE:
			case TRUE_FALSE:
			case SELECT:
				for (String suffix : OPTION_SUFFIXES) {
					headers.add(RepoTemplateI18n.optionLabel(suffix));
				}
				break;
			case FILL_BLANK:
				for (String index : BLANK_INDEXES) {
					headers.add(RepoTemplateI18n.blankLabel(index));
				}
				break;
			case CASCADER:

				headers.add(RepoTemplateI18n.optionTreeLabel() + "(JSON)");
				break;
			case MATRIX_RADIO:
			case MATRIX_CHECKBOX:
			case MATRIX_FILL_BLANK:
				for (int i = 1; i <= MAX_MATRIX_TITLE_INDEX; i++) {
					headers.add(RepoTemplateI18n.rowTitleLabel(String.valueOf(i)));
				}
				for (int i = 1; i <= MAX_MATRIX_TITLE_INDEX; i++) {
					headers.add(RepoTemplateI18n.columnTitleLabel(String.valueOf(i)));
				}
				break;
			default:
				break;
		}
		headers.add(RepoTemplateI18n.advancedJsonLabel() + "(JSON)");
		return headers;
	}

	/**
	 * 写一个 sheet：第一行表头、其余行为数据。抽成一处，是为了让 13 种题型共用同一套
	 * 「列宽自适应 / 空值跳过 / 数字与文本分别写」的规则，也方便单测直接比对表头。
	 */
	private static void writeSheet(Workbook workbook, RepoTemplateI18n.SheetType sheetType, List<String> headers,
			List<List<Object>> rows) {

		Worksheet sheet = workbook.newWorksheet(sheetType.exportName());
		sheet.fitToWidth((short) 10);
		sheet.setFitToPage(true);
		for (int column = 0; column < headers.size(); column++) {
			sheet.value(0, column, headers.get(column));
		}
		for (int index = 0; index < rows.size(); index++) {
			List<Object> row = rows.get(index);
			for (int column = 0; column < headers.size(); column++) {
				writeCell(sheet, index + 1, column, column < row.size() ? row.get(column) : null);
			}
		}
	}

	private static void writeCell(Worksheet sheet, int row, int column, Object value) {
		if (value == null) {
			return;
		}
		if (value instanceof Number number) {
			sheet.value(row, column, number);
			return;
		}
		String text = value.toString();

		if (!text.isEmpty()) {
			sheet.value(row, column, text);
		}
	}

}
