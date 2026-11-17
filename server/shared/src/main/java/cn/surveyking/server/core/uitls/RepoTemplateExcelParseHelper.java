package cn.surveyking.server.core.uitls;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateRequest;
import lombok.SneakyThrows;
import org.dhatim.fastexcel.reader.Cell;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 题库/试卷 Excel 模板解析：按 sheet 名分发到各题型，按表头名字定位列（不写死列号）。
 *
 * <p>
 * 约定：
 * <ul>
 * <li>每个 sheet 的第一行是表头，表头之前允许写「使用说明」（表头按内容识别，老模板第一行即表头，行为不变）；</li>
 * <li>五种老 sheet（单选题/多选题/判断题/填空题/简答题）解析结果保持不变；</li>
 * <li>新增 sheet：下拉题 / 评分题 / NPS题 / 级联题 / 上传题 / 矩阵单选题 / 矩阵多选题 / 矩阵填空题；</li>
 * <li>「高级配置(JSON)」列对任何 sheet 生效，深度合并到该行生成的题目上；</li>
 * <li>每行解析结果都带上 {@code sourceSheet/sourceRow}，调用方据此把该行的内嵌图片（ExcelRowImages）挂到题干末尾。</li>
 * </ul>
 *
 * @author javahuang
 * @date 2022/5/31
 */
public class RepoTemplateExcelParseHelper {

	/** 高级配置/选项树列用：未知字段忽略，老师多写一个键不至于整份导入失败 */
	private static final ObjectMapper JSON = JsonMapper.builder()
			.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();

	/** 分数列留空时的默认分值与评分题默认满星 */
	private static final int DEFAULT_SCORE = 5;

	/** NPS 默认最高分：0~10 共 11 档（与设计器默认 npsTotalNum=11 对齐） */
	private static final int DEFAULT_NPS_MAX = 10;

	/** 前端 npsRange 最多 21 档，这里跟着封顶 */
	private static final int MAX_NPS_STEPS = 21;

	private static final List<String> OPTION_SUFFIXES = Arrays.asList("A", "B", "C", "D", "E", "F", "G", "H");

	/** 行标题1..10 / 列标题1..10 */
	private static final int MAX_MATRIX_TITLE_INDEX = 10;

	private final MultipartFile templateFile;

	private List<TemplateRequest> result = new ArrayList<>();

	private Set<String> ids = new HashSet<>();

	/**
	 * 标题与索引的映射关系
	 */
	private Map<String, Integer> name2index = new HashMap<>();

	private List<ParseWarning> warnings = new ArrayList<>();

	private String currentSheetName;

	public RepoTemplateExcelParseHelper(MultipartFile templateFile) {
		this.templateFile = templateFile;
	}

	/**
	 * 非致命提示（JSON 列写错、图片超限等），由调用方并入 ImportPreview.warnings。
	 */
	public List<ParseWarning> getWarnings() {
		return warnings;
	}

	@SneakyThrows
	public List<TemplateRequest> parse() {
		ExcelImportSecurity.validateFile(templateFile);
		ExcelImportSecurity.RowGuard rowGuard = ExcelImportSecurity.newRowGuard();
		try (InputStream is = templateFile.getInputStream(); ReadableWorkbook wb = new ReadableWorkbook(is)) {
			wb.getSheets().forEach(sheet -> {
				String sheetName = sheet.getName();
				RepoTemplateI18n.SheetType sheetType = RepoTemplateI18n.SheetType.fromName(sheetName);
				currentSheetName = sheetName;
				int[] currentRowNum = { 1 };
				boolean[] headerFound = { false };
				try (Stream<Row> rows = sheet.openStream()) {
					rows.forEach(r -> {
						rowGuard.validate(r);
						currentRowNum[0] = r.getRowNum();
						if (!headerFound[0]) {
							// 表头按内容识别：表头之前的行是「使用说明」，不参与解析
							if (isHeaderRow(r)) {
								parseHeader(r);
								headerFound[0] = true;
							}
							return;
						}
						if (sheetType == null || isEmptyRow(r)) {
							return;
						}
						parseDataRow(r, sheetType);
					});
				}
				catch (ErrorCodeException e) {
					throw e;
				}
				catch (Exception e) {
					throw buildParseException(sheetName, currentRowNum[0], e);
				}
			});
		}
		catch (ErrorCodeException e) {
			throw e;
		}
		catch (Exception e) {
			throw buildParseException(null, null, e);
		}
		return result;
	}

	private void parseDataRow(Row r, RepoTemplateI18n.SheetType sheetType) {
		switch (sheetType) {
			case SINGLE_CHOICE:
				parseRadioOrJudge(r, SurveySchema.QuestionType.Radio);
				break;
			case TRUE_FALSE:
				parseRadioOrJudge(r, SurveySchema.QuestionType.Judge);
				break;
			case MULTIPLE_CHOICE:
				parseCheckbox(r);
				break;
			case FILL_BLANK:
				parseFillBlank(r);
				break;
			case TEXTAREA:
				parseTextarea(r);
				break;
			case SELECT:
				parseSelect(r);
				break;
			case SCORE:
				parseScore(r);
				break;
			case NPS:
				parseNps(r);
				break;
			case MATRIX_RADIO:
				parseMatrix(r, SurveySchema.QuestionType.MatrixRadio);
				break;
			case MATRIX_CHECKBOX:
				parseMatrix(r, SurveySchema.QuestionType.MatrixCheckbox);
				break;
			case UPLOAD:
				parseUpload(r);
				break;
			case MATRIX_FILL_BLANK:
				parseMatrix(r, SurveySchema.QuestionType.MatrixFillBlank);
				break;
			case CASCADER:
				parseCascader(r);
				break;
			default:
				break;
		}
	}

	// ------ 老的五种 sheet：解析结果保持不变

	private void parseRadioOrJudge(Row r, SurveySchema.QuestionType questionType) {
		SurveySchema schema = row2schema(r);
		schema.setType(questionType);
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.onlyOne);
		addQuestion(schema, r);
	}

	private void parseCheckbox(Row r) {
		SurveySchema schema = row2schema(r);
		schema.setType(SurveySchema.QuestionType.Checkbox);
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.selectAll);
		addQuestion(schema, r);
	}

	private void parseFillBlank(Row r) {
		SurveySchema schema = row2schema(r);
		SurveySchema.QuestionType questionType = schema.getChildren().size() > 1
				? SurveySchema.QuestionType.MultipleBlank : SurveySchema.QuestionType.FillBlank;
		schema.setType(questionType);
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.selectAll);
		schema.getAttribute().setExamMatchRule(SurveySchema.ExamMatchRule.completeSame);
		addQuestion(schema, r);
	}

	private void parseTextarea(Row r) {
		SurveySchema schema = row2schema(r);
		schema.setType(SurveySchema.QuestionType.Textarea);

		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.selectAll);
		schema.getAttribute().setExamMatchRule(SurveySchema.ExamMatchRule.completeSame);
		String correctAnswer = getCellAsString(r, "examCorrectAnswer");
		// 简答题没有设置选项，只有答案列，所以需要手动的添加 option
		schema.setChildren(Collections.singletonList(SurveySchema.builder().id(generateId())
				.attribute(SurveySchema.Attribute.builder().examCorrectAnswer(correctAnswer).build()).build()));
		addQuestion(schema, r);
	}

	// ------ 新增的八种 sheet

	/** 下拉题：选项来自「选项A…选项H」，答案列写选项字母 */
	private void parseSelect(Row r) {
		SurveySchema schema = baseSchema(r);
		schema.setType(SurveySchema.QuestionType.Select);
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.onlyOne);
		schema.getAttribute().setRequired(false);
		applyOptionChildren(schema, r, getCellAsString(r, "examCorrectAnswer"));
		if (schema.getChildren().isEmpty()) {
			throw new IllegalArgumentException("下拉题至少要有一个「" + RepoTemplateI18n.optionLabel("A") + "」选项");
		}
		addQuestion(schema, r);
	}

	/** 评分题：分数列作为满星（默认 5），答案列可空 */
	private void parseScore(Row r) {
		SurveySchema schema = baseSchema(r);
		schema.setType(SurveySchema.QuestionType.Score);
		int max = roundScore(schema.getAttribute().getExamScore(), DEFAULT_SCORE);
		// 前端 Score 组件的星数取 attribute.scope 的上限
		schema.getAttribute().setScope("[0," + max + "]");
		// 评分题没有机器判分（EXAM_TYPES 不含 Score），显式标成不计分，避免出现「0 分待批改」
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.none);
		addQuestion(schema, r);
	}

	/** NPS 题：分数列写最高分（默认 10，生成 0~10 共 11 档） */
	private void parseNps(Row r) {
		SurveySchema schema = baseSchema(r);
		schema.setType(SurveySchema.QuestionType.Nps);
		int max = roundScore(schema.getAttribute().getExamScore(), DEFAULT_NPS_MAX);
		if (max < 1) {
			max = DEFAULT_NPS_MAX;
		}
		schema.getAttribute().setNpsStartNum(0);
		schema.getAttribute().setNpsTotalNum(Math.min(max + 1, MAX_NPS_STEPS));
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.none);
		schema.getAttribute().setRequired(false);
		// 设计器给 NPS 留了一个空 children：后端有取 getChildren().get(0) 的地方
		schema.getChildren().add(emptyOption());
		addQuestion(schema, r);
	}

	/**
	 * 上传题：题干 + 分数 + 答案列（可选，当「参考答案/示例说明」保留）。
	 *
	 * <p>
	 * 属性跟设计器建题的默认值对齐：前端 Upload 组件读的是 {@code maxFileCount / maxFileSize}
	 * （client/src/renderer/questions/Upload.tsx），不是 uploadCount。
	 */
	private void parseUpload(Row r) {
		SurveySchema schema = baseSchema(r);
		schema.setType(SurveySchema.QuestionType.Upload);
		schema.getAttribute().setRequired(false);
		schema.getAttribute().setMaxFileCount(1);
		schema.getAttribute().setMaxFileSize(5D);
		// 上传题没有机器判分（前端 EXAM_TYPES 也不含 Upload）
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.none);
		String answer = getCellAsString(r, "examCorrectAnswer");
		if (isNotBlank(answer)) {
			schema.getAttribute().setExamCorrectAnswer(answer.trim());
		}
		// 设计器给上传题留一个空 children：后端有取 getChildren().get(0) 的地方
		schema.getChildren().add(emptyOption());
		addQuestion(schema, r);
	}

	/**
	 * 矩阵题（单选/多选/填空）：行在 {@code schema.row}，列在 {@code dataSource}，children 同步一份列节点。
	 *
	 * <p>
	 * 这是设计器（client/src/designer/defaults.ts 的 MATRIX_TYPES 分支）真正生成的形状：渲染层按
	 * {@code row} 画行、按 {@code dataSource}（缺省回落到 children）画列，两层 children 的写法渲染不出来。
	 */
	private void parseMatrix(Row r, SurveySchema.QuestionType questionType) {
		SurveySchema schema = baseSchema(r);
		schema.setType(questionType);
		schema.getAttribute().setRequired(false);
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.none);

		List<SurveySchema.Row> rows = new ArrayList<>();
		for (int i = 1; i <= MAX_MATRIX_TITLE_INDEX; i++) {
			String title = getCellAsString(r, "rowTitle" + i);
			if (isBlank(title)) {
				continue;
			}
			SurveySchema.Row row = new SurveySchema.Row();
			row.setId(generateId());
			row.setTitle(title.trim());
			rows.add(row);
		}

		List<SurveySchema> children = new ArrayList<>();
		List<SurveySchema.DataSource> columns = new ArrayList<>();
		for (int i = 1; i <= MAX_MATRIX_TITLE_INDEX; i++) {
			String title = getCellAsString(r, "columnTitle" + i);
			if (isBlank(title)) {
				continue;
			}
			String columnId = generateId();
			children.add(SurveySchema.builder().id(columnId).title(title.trim())
					.type(SurveySchema.QuestionType.Option)
					.attribute(SurveySchema.Attribute.builder().build()).build());
			columns.add(new SurveySchema.DataSource(title.trim(), columnId, null));
		}

		if (rows.isEmpty() || columns.isEmpty()) {
			throw new IllegalArgumentException("矩阵题至少要填一个「" + RepoTemplateI18n.rowTitleLabel("1") + "」和一个「"
					+ RepoTemplateI18n.columnTitleLabel("1") + "」");
		}

		schema.setRow(rows);
		schema.setChildren(children);
		schema.setDataSource(columns);
		applyMatrixAnswer(schema, r, questionType, rows.size());
		addQuestion(schema, r);
	}

	/**
	 * 矩阵答案：按行填写，行之间用 {@code |}，行内多选用 {@code ,}。
	 *
	 * <p>
	 * 矩阵题不参与自动判分（前端 EXAM_TYPES 也不含矩阵），所以答案原样存进
	 * {@code attribute.examCorrectAnswer}（行之间 {@code |}），不做选项 id 映射。
	 */
	private void applyMatrixAnswer(SurveySchema schema, Row r, SurveySchema.QuestionType questionType,
			int rowCount) {
		String answer = getCellAsString(r, "examCorrectAnswer");
		if (isBlank(answer)) {
			return;
		}
		String normalized = answer.trim();
		schema.getAttribute().setExamCorrectAnswer(normalized);
		if (questionType == SurveySchema.QuestionType.MatrixRadio
				|| questionType == SurveySchema.QuestionType.MatrixCheckbox) {
			int answerRows = splitRows(normalized).size();
			if (answerRows != rowCount) {
				warnings.add(warning("MATRIX_ANSWER_MISMATCH",
						"工作表「" + currentSheetName + "」第 " + r.getRowNum() + " 行：答案有 " + answerRows + " 行，但「"
								+ RepoTemplateI18n.rowTitleLabel("1") + "」填了 " + rowCount + " 行"));
			}
		}
	}

	/** 级联题：选项树(JSON) 列填 [{"label":"山东","value":"sd","children":[...]}]，答案列写路径 sd/jn */
	private void parseCascader(Row r) {
		String rawTree = getCellAsString(r, "optionTree");
		if (isBlank(rawTree)) {
			throw new IllegalArgumentException("级联题需要「" + RepoTemplateI18n.optionTreeLabel()
					+ "(JSON)」列，填 [{\"label\":\"山东\",\"value\":\"sd\"}] 这样的 JSON 数组");
		}
		List<SurveySchema.DataSource> dataSource = parseDataSourceTree(rawTree);
		if (dataSource.isEmpty()) {
			throw new IllegalArgumentException("级联题的「" + RepoTemplateI18n.optionTreeLabel() + "(JSON)」是空数组");
		}
		SurveySchema schema = baseSchema(r);
		schema.setType(SurveySchema.QuestionType.Cascader);
		schema.setDataSource(dataSource);
		schema.getAttribute().setRequired(false);
		schema.getAttribute().setPlaceholder("请选择");
		schema.getAttribute().setExamAnswerMode(SurveySchema.ExamScoreMode.onlyOne);
		schema.getAttribute().setCascaderLevel(maxDepth(dataSource, 1));
		applyCascaderAnswer(schema, r, dataSource);
		// 设计器给级联题留了一个空 children，这里保持一致
		schema.getChildren().add(emptyOption());
		addQuestion(schema, r);
	}

	private void applyCascaderAnswer(SurveySchema schema, Row r, List<SurveySchema.DataSource> dataSource) {
		String answer = getCellAsString(r, "examCorrectAnswer");
		if (isBlank(answer)) {
			return;
		}
		List<String> path = Arrays.stream(answer.trim().split("[/／>＞]")).map(String::trim)
				.filter(StringUtils::hasText).collect(Collectors.toList());
		if (path.isEmpty()) {
			return;
		}
		String leaf = path.get(path.size() - 1);
		if (!containsValue(dataSource, leaf)) {
			warnings.add(warning("CASCADER_ANSWER_NOT_FOUND", "工作表「" + currentSheetName + "」第 " + r.getRowNum()
					+ " 行：答案路径「" + answer + "」的末级 " + leaf + " 在选项树里找不到，已按原样保存"));
		}
		// 前端级联答案只记末级 value（cascaderPath 反查整条路径）
		schema.getAttribute().setExamCorrectAnswer(leaf);
	}

	// ------ 公共构件

	/**
	 * 各类 sheet 共用的题目骨架：题干（含图片 token）、解析、分数、章节、难度、标签。
	 */
	private SurveySchema baseSchema(Row r) {
		String tags = getCellAsString(r, "tags");
		return SurveySchema.builder().title(getCellAsString(r, "title"))
				.attribute(SurveySchema.Attribute.builder().examAnalysis(getCellAsString(r, "examAnalysis"))
						.examScore(getCellAsDouble(r, "examScore")).build())
				.id(generateId()).chapter(getCellAsString(r, "chapter"))
				.difficulty(getCellAsString(r, "difficulty"))
				.tags(tags != null ? Arrays.asList(tags.split("\\s|,")) : null).children(new ArrayList<>())
				.build();
	}

	/** 选项类题目：children（答案 key）与 dataSource（渲染用）同步生成，与设计器一致 */
	private void applyOptionChildren(SurveySchema schema, Row r, String correctAnswer) {
		List<SurveySchema> children = new ArrayList<>();
		List<SurveySchema.DataSource> dataSources = new ArrayList<>();
		for (String suffix : OPTION_SUFFIXES) {
			String optionText = getCellAsString(r, "option" + suffix);
			if (isBlank(optionText)) {
				continue;
			}
			String optionId = generateId();
			boolean correct = currentChecked(suffix.charAt(0) - 'A', correctAnswer);
			children.add(SurveySchema.builder().id(optionId).title(optionText)
					.type(SurveySchema.QuestionType.Option)
					.attribute(SurveySchema.Attribute.builder().examCorrectAnswer(correct ? optionId : null).build())
					.build());
			dataSources.add(new SurveySchema.DataSource(optionText, optionId, null));
		}
		schema.setChildren(children);
		schema.setDataSource(dataSources.isEmpty() ? null : dataSources);
	}

	private SurveySchema emptyOption() {
		return SurveySchema.builder().id(generateId()).type(SurveySchema.QuestionType.Option)
				.attribute(SurveySchema.Attribute.builder().build()).build();
	}

	/**
	 * 组装一条 TemplateRequest：先合并「高级配置(JSON)」，再取题型/标题/章节。
	 */
	private void addQuestion(SurveySchema schema, Row r) {
		SurveySchema merged = applyAdvancedJson(schema, r);
		if (merged.getType() == null) {
			merged.setType(schema.getType());
		}
		TemplateRequest templateRequest = TemplateRequest.builder().questionType(merged.getType())
				.mode(ProjectModeEnum.exam).name(merged.getTitle()).serialNo(serialNo(r)).template(merged).build();
		templateRequest.setChapter(merged.getChapter());
		templateRequest.setDifficulty(merged.getDifficulty());
		// 图片按行归属：调用方拿这两个字段把内嵌图片挂到题干末尾（题库导入与试卷导入都靠它）
		templateRequest.setSourceSheet(currentSheetName);
		templateRequest.setSourceRow(r.getRowNum());
		result.add(templateRequest);
	}

	private String serialNo(Row r) {
		Integer index = name2index.get("serialNo");
		String value = index == null ? null : r.getCellText(index);
		return isNotBlank(value) ? value : r.getCellText(0);
	}

	// ------ 高级配置(JSON)：深度合并到该行生成的题目上

	private SurveySchema applyAdvancedJson(SurveySchema schema, Row r) {
		String raw = getCellAsString(r, "advancedJson");
		if (isBlank(raw)) {
			return schema;
		}
		try {
			@SuppressWarnings("unchecked")
			Map<String, Object> override = JSON.readValue(raw, Map.class);
			if (override == null || override.isEmpty()) {
				return schema;
			}
			@SuppressWarnings("unchecked")
			Map<String, Object> base = JSON.readValue(JSON.writeValueAsString(schema), Map.class);
			Map<String, Object> merged = deepMerge(base, override);
			SurveySchema mergedSchema = JSON.readValue(JSON.writeValueAsString(merged), SurveySchema.class);
			return mergedSchema == null ? schema : mergedSchema;
		}
		catch (Exception e) {
			// 单行 JSON 写错不该拖垮整份导入：给出可定位的提示，该行按模板列原样导入
			warnings.add(warning("ADVANCED_JSON_INVALID", "工作表「" + currentSheetName + "」第 " + r.getRowNum()
					+ " 行：高级配置(JSON) 解析失败，该行已按模板列导入——" + describe(e)));
			return schema;
		}
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> deepMerge(Map<String, Object> base, Map<String, Object> override) {
		Map<String, Object> merged = new LinkedHashMap<>(base);
		for (Map.Entry<String, Object> entry : override.entrySet()) {
			Object current = merged.get(entry.getKey());
			Object next = entry.getValue();
			if (current instanceof Map && next instanceof Map) {
				merged.put(entry.getKey(),
						deepMerge((Map<String, Object>) current, (Map<String, Object>) next));
			}
			else {
				merged.put(entry.getKey(), next);
			}
		}
		return merged;
	}

	// ------ 选项树(JSON)

	private List<SurveySchema.DataSource> parseDataSourceTree(String json) {
		List<?> raw;
		try {
			raw = JSON.readValue(json, List.class);
		}
		catch (Exception e) {
			throw new IllegalArgumentException("选项树不是合法的 JSON 数组——" + describe(e));
		}
		return toDataSources(raw, 1);
	}

	private List<SurveySchema.DataSource> toDataSources(List<?> raw, int level) {
		if (level > 10) {
			throw new IllegalArgumentException("选项树层级超过 10 层，请检查是否循环嵌套");
		}
		List<SurveySchema.DataSource> list = new ArrayList<>();
		for (Object item : raw) {
			if (!(item instanceof Map)) {
				throw new IllegalArgumentException("选项树的每一项都必须是 {\"label\":\"…\",\"value\":\"…\"} 对象");
			}
			Map<?, ?> node = (Map<?, ?>) item;
			String label = asText(node.get("label"));
			String value = asText(node.get("value"));
			if (isBlank(label) || isBlank(value)) {
				throw new IllegalArgumentException("选项树的每一项都要有 label 和 value");
			}
			Object childrenRaw = node.get("children");
			List<SurveySchema.DataSource> children = childrenRaw instanceof List
					? toDataSources((List<?>) childrenRaw, level + 1) : null;
			list.add(new SurveySchema.DataSource(label.trim(), value.trim(), children));
		}
		return list;
	}

	private int maxDepth(List<SurveySchema.DataSource> nodes, int depth) {
		int max = depth;
		for (SurveySchema.DataSource node : nodes) {
			if (node.getChildren() != null && !node.getChildren().isEmpty()) {
				max = Math.max(max, maxDepth(node.getChildren(), depth + 1));
			}
		}
		return max;
	}

	private boolean containsValue(List<SurveySchema.DataSource> nodes, String value) {
		if (nodes == null || nodes.isEmpty()) {
			return false;
		}
		for (SurveySchema.DataSource node : nodes) {
			if (value.equals(node.getValue()) || containsValue(node.getChildren(), value)) {
				return true;
			}
		}
		return false;
	}

	// ------ 老逻辑（选项列区间、表头解析、单元格取值）

	/**
	 * @param currentIndex 当前选项的序号，从 0 开始
	 * @param rightAnswer 正确答案序号 A/B/C/D
	 * @return
	 */
	private boolean currentChecked(int currentIndex, String rightAnswer) {
		if (isBlank(rightAnswer)) {
			return false;
		}
		for (int i = 0; i < rightAnswer.length(); i++) {
			if (rightAnswer.toUpperCase().codePointAt(i) - 65 == currentIndex) {
				return true;
			}
		}
		return false;
	}

	private SurveySchema row2schema(Row r) {
		String title = getCellAsString(r, "title");
		String correctAnswer = getCellAsString(r, "examCorrectAnswer");
		Double examScore = getCellAsDouble(r, "examScore");
		String tags = getCellAsString(r, "tags");

		List<SurveySchema> optionSchemaList = r.stream()
				.filter(cell -> cell != null && name2index.get("minOptionIndex") != null
						&& cell.getColumnIndex() >= name2index.get("minOptionIndex")
						&& cell.getColumnIndex() <= name2index.get("maxOptionIndex") && isNotBlank(cell.getText()))
				.map(x -> {
					String optionTitle = x.getText();
					String examCorrectAnswer = x.getText();
					String optionId = generateId();
					// 填空题选项存的是答案，单选多选存的是选项的文本
					if (name2index.get("isChoice") != null) {
						// 处理选项
						int columnIndex = x.getColumnIndex() - name2index.get("minOptionIndex");
						boolean currentCorrect = currentChecked(columnIndex, correctAnswer);
						examCorrectAnswer = currentCorrect ? optionId : null;
					}
					else {
						optionTitle = null;
					}

					return SurveySchema.builder().id(optionId).title(optionTitle)
							.attribute(SurveySchema.Attribute.builder().examCorrectAnswer(examCorrectAnswer).build())
							.build();
				}).collect(Collectors.toList());

		return SurveySchema.builder().title(title).attribute(SurveySchema.Attribute.builder()
				// 解析
				.examAnalysis(getCellAsString(r, "examAnalysis"))
				// 分值
				.examScore(examScore).build()).id(generateId())
				.chapter(getCellAsString(r, "chapter")).difficulty(getCellAsString(r, "difficulty"))
				.tags(tags != null ? Arrays.asList(tags.split("\\s|,")) : null).children(optionSchemaList).build();

	}

	/**
	 * 根据标题解析出来各个选项的顺序
	 * @param header
	 */
	private void parseHeader(Row header) {
		name2index = new HashMap<>();
		List<Integer> optionCellIndexes = new ArrayList<>();
		header.stream().forEach(cell -> {
			if (cell == null) {
				return;
			}
			int columnIndex = cell.getColumnIndex();
			String cellText = cell.getText();
			RepoTemplateI18n.HeaderLabel headerLabel = RepoTemplateI18n.HeaderLabel.fromText(cellText);
			if (headerLabel != null) {
				headerLabel.apply(name2index, columnIndex);
				return;
			}
			String optionSuffix = RepoTemplateI18n.optionSuffix(cellText);
			if (optionSuffix != null) {
				optionCellIndexes.add(columnIndex);
				name2index.put("isChoice", -1);
				name2index.put("option" + optionSuffix, columnIndex);
				return;
			}
			if (RepoTemplateI18n.isBlankColumn(cellText)) {
				optionCellIndexes.add(columnIndex);
				name2index.put("isFillBlank", -1);
				return;
			}
			Integer rowTitleIndex = RepoTemplateI18n.rowTitleIndex(cellText);
			if (rowTitleIndex != null) {
				name2index.put("rowTitle" + rowTitleIndex, columnIndex);
				return;
			}
			Integer columnTitleIndex = RepoTemplateI18n.columnTitleIndex(cellText);
			if (columnTitleIndex != null) {
				name2index.put("columnTitle" + columnTitleIndex, columnIndex);
			}
		});
		if (optionCellIndexes.size() > 0) {
			name2index.put("minOptionIndex", optionCellIndexes.stream().mapToInt(v -> v).min().getAsInt());
			name2index.put("maxOptionIndex", optionCellIndexes.stream().mapToInt(v -> v).max().getAsInt());
		}
	}

	private boolean isHeaderRow(Row r) {
		for (Cell cell : r) {
			if (cell != null
					&& RepoTemplateI18n.HeaderLabel.fromText(cell.getText()) == RepoTemplateI18n.HeaderLabel.TITLE) {
				return true;
			}
		}
		return false;
	}

	private boolean isEmptyRow(Row r) {
		return r.stream().allMatch(cell -> cell == null || isBlank(cell.getText()));
	}

	/**
	 * 避免列索引为空时获取值报错
	 * @param row
	 * @param cellName
	 * @return
	 */
	private String getCellAsString(Row row, String cellName) {
		if (name2index.get(cellName) == null) {
			return null;
		}
		return row.getCellAsString(name2index.get(cellName)).orElse(null);
	}

	private Double getCellAsDouble(Row row, String cellName) {
		if (name2index.get(cellName) == null) {
			return null;
		}
		String value = row.getCellText(name2index.get(cellName));
		if (isBlank(value)) {
			return null;
		}
		return Double.parseDouble(value);
	}

	private int roundScore(Double score, int defaultScore) {
		if (score == null || score < 1) {
			return defaultScore;
		}
		return (int) Math.round(score);
	}

	private List<String> splitRows(String answer) {
		return Arrays.stream(answer.split("[|｜]")).map(String::trim).filter(StringUtils::hasText)
				.collect(Collectors.toList());
	}

	private String asText(Object value) {
		if (value == null) {
			return null;
		}
		return String.valueOf(value);
	}

	private String describe(Throwable e) {
		if (e == null) {
			return "未知错误";
		}
		String message = e.getMessage();
		if (isBlank(message)) {
			return e.getClass().getSimpleName();
		}
		return message.length() > 200 ? message.substring(0, 200) + "…" : message;
	}

	private ParseWarning warning(String code, String message) {
		return new ParseWarning("warn", code, message);
	}

	private String generateId() {
		return NanoIdUtils.randomNanoId(4, ids);
	}

	private ErrorCodeException buildParseException(String sheetName, Integer rowNum, Exception e) {
		StringBuilder message = new StringBuilder("题库模板导入失败");
		if (isNotBlank(sheetName)) {
			message.append("，工作表：").append(sheetName);
		}
		if (rowNum != null && rowNum > 0) {
			message.append("，第").append(rowNum).append("行");
		}
		String detailMessage = extractDetailMessage(e);
		if (isNotBlank(detailMessage)) {
			message.append("，原因：").append(detailMessage);
		}
		return new ErrorCodeException(ErrorCode.FileParseError, message.toString(), e);
	}

	private String extractDetailMessage(Throwable throwable) {
		Throwable current = throwable;
		while (current != null && current.getCause() != null && current.getCause() != current) {
			current = current.getCause();
		}
		if (current == null) {
			return null;
		}
		return isNotBlank(current.getMessage()) ? current.getMessage() : current.getClass().getSimpleName();
	}

	/**
	 * 解析中的非致命提示。
	 */
	public static final class ParseWarning {

		private final String level;

		private final String code;

		private final String message;

		ParseWarning(String level, String code, String message) {
			this.level = level;
			this.code = code;
			this.message = message;
		}

		public String getLevel() {
			return level;
		}

		public String getCode() {
			return code;
		}

		public String getMessage() {
			return message;
		}

	}

}
