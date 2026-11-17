package cn.surveyking.server.core.importer;

import cn.surveyking.server.core.uitls.NanoIdUtils;
import cn.surveyking.server.domain.dto.SurveySchema;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 文本题目解析：把「一行标题 + 若干道题」的纯文本解析成 {@link ImportPreview}。
 *
 * <p>
 * 约定（与导入模板说明一致）：
 * <ul>
 * <li>首个非空行是试卷标题（若它本身带题型标记/题号，则不当作标题）；</li>
 * <li>题目之间用空行分隔；题型用【单选题】【多选题】【判断题】【填空题】【多项填空】【简答题】【下拉题】【评分题】
 * 【NPS】【上传题】【矩阵单选题】【矩阵多选题】【矩阵填空题】【欢迎语】标记；</li>
 * <li>矩阵题在标记之后用若干行「行：xxx」「列：xxx」定义行/列，答案按行写、行之间用 {@code |}；</li>
 * <li>分值写法：（10分）；正确答案：（正确答案）标在选项后，或写「答案：A」；</li>
 * <li>解析写「解析：」「答案解析：」；标签写「标签：」；难度写「难度：」（本版本只提示不保存）。</li>
 * </ul>
 */
public class TextQuestionParser {

	private static final Pattern MARKER = Pattern.compile("【\\s*([^】]{1,12}?)\\s*】");

	private static final Pattern SCORE = Pattern.compile("[（(]\\s*(\\d+(?:\\.\\d+)?)\\s*分\\s*[）)]");

	private static final Pattern OPTION_PREFIX = Pattern.compile("^\\s*([A-Ha-h])\\s*[.、．)）:：]\\s*(.*)$");

	private static final Pattern META = Pattern.compile("^\\s*(答案解析|参考答案|正确答案|答案|解析|标签|难度|分数|分值|题型|章节)\\s*[:：]\\s*(.*)$");

	private static final Pattern QUESTION_NO = Pattern.compile("^\\s*\\d+\\s*[.、．)）]\\s*");

	private static final Pattern CORRECT_FLAG = Pattern.compile("[（(]\\s*正确答案\\s*[）)]");

	private static final Pattern BLANK_TOKEN = Pattern.compile("_{2,}|＿{2,}");

	/** 矩阵题的行：行：xxx */
	private static final Pattern MATRIX_ROW = Pattern.compile("^行\\s*[:：]\\s*(.*)$");

	/** 矩阵题的列：列：xxx */
	private static final Pattern MATRIX_COLUMN = Pattern.compile("^列\\s*[:：]\\s*(.*)$");

	private final String rawText;

	private final Set<String> ids = new HashSet<>();

	private final List<ImportPreview.Warning> warnings = new ArrayList<>();

	private boolean difficultySeen = false;

	private final boolean detectTitle;

	public TextQuestionParser(String rawText) {
		this(rawText, true);
	}

	public TextQuestionParser(String rawText, boolean detectTitle) {
		this.rawText = rawText == null ? "" : rawText;
		this.detectTitle = detectTitle;
	}

	public ImportPreview parse() {
		List<String> lines = splitLines(rawText);
		String title = null;
		int start = 0;
		int first = firstNonBlank(lines);
		if (detectTitle && first >= 0 && looksLikeTitle(lines.get(first).trim())) {
			title = cleanStem(lines.get(first).trim());
			start = first + 1;
		}

		List<SurveySchema> questions = new ArrayList<>();
		String description = null;
		int serial = 0;
		for (List<String> block : splitBlocks(lines, start)) {
			Parsed parsed = parseBlock(block, ++serial);
			if (parsed == null) {
				continue;
			}
			if (parsed.welcome) {
				description = parsed.stem;
				continue;
			}
			questions.add(parsed.schema);
		}

		SurveySchema tree = SurveySchema.builder().id(newId()).type(SurveySchema.QuestionType.Survey).title(title)
				.description(description).children(questions).build();

		Map<String, Integer> byType = new LinkedHashMap<>();
		double totalScore = 0;
		for (SurveySchema question : questions) {
			byType.merge(question.getType().name(), 1, Integer::sum);
			Double score = question.getAttribute() == null ? null : question.getAttribute().getExamScore();
			totalScore += score == null ? 0 : score;
		}

		return ImportPreview.builder().title(title).description(description).tree(tree).flat(questions)
				.stats(ImportPreview.Stats.builder().total(questions.size()).score(totalScore).groups(0)
						.byType(byType).build())
				.warnings(warnings).build();
	}

	// ------------------------------------------------------------------ 解析单题

	private Parsed parseBlock(List<String> block, int serial) {
		String firstLine = block.get(0).trim();
		String marker = null;
		Matcher markerMatcher = MARKER.matcher(firstLine);
		if (markerMatcher.find()) {
			marker = markerMatcher.group(1).trim();
			firstLine = markerMatcher.replaceAll("").trim();
		}
		if (isWelcome(marker)) {
			return Parsed.welcome(cleanStem(firstLine));
		}

		ScoreText scoreText = extractScore(firstLine);
		String stem = cleanStem(scoreText.text);
		if (!StringUtils.hasText(stem)) {
			return null;
		}

		List<String> extras = new ArrayList<>();
		String answer = null;
		String analysis = null;
		String tags = null;
		String metaType = null;
		String difficulty = null;
		String chapter = null;
		Double metaScore = null;
		for (int i = 1; i < block.size(); i++) {
			String line = block.get(i).trim();
			if (!StringUtils.hasText(line)) {
				continue;
			}
			Matcher meta = META.matcher(line);
			if (meta.matches()) {
				String key = meta.group(1);
				String value = meta.group(2).trim();
				if ("答案解析".equals(key) || "解析".equals(key)) {
					analysis = value;
				}
				else if ("正确答案".equals(key) || "答案".equals(key) || "参考答案".equals(key)) {
					answer = value;
				}
				else if ("标签".equals(key)) {
					tags = value;
				}
				else if ("分数".equals(key) || "分值".equals(key)) {
					metaScore = parseScore(value);
				}
				else if ("题型".equals(key)) {
					metaType = value;
				}
				else if ("章节".equals(key)) {
					chapter = value;
				}
				else {
					difficulty = value;
				}
				continue;
			}
			extras.add(line);
		}

		SurveySchema.QuestionType type = resolveType(marker != null ? marker : metaType, stem, extras, answer,
				serial);
		List<SurveySchema> children = new ArrayList<>();
		List<SurveySchema.DataSource> dataSources = new ArrayList<>();
		List<SurveySchema.Row> rows = null;

		if (type == SurveySchema.QuestionType.Radio || type == SurveySchema.QuestionType.Checkbox
				|| type == SurveySchema.QuestionType.Judge || type == SurveySchema.QuestionType.Select) {
			parseChoice(type, extras, answer, children, dataSources, serial);
			if (children.isEmpty()) {
				warn("warn", "OPTION_MISSING", "第 " + serial + " 题没有识别到选项，已跳过");
				return null;
			}
		}
		else if (type == SurveySchema.QuestionType.Textarea) {
			if (!StringUtils.hasText(answer)) {
				warn("warn", "ANSWER_MISSING", "第 " + serial + " 题缺少参考答案");
			}
			children.add(SurveySchema.builder().id(newId()).attribute(SurveySchema.Attribute.builder()
					.examCorrectAnswer(answer == null ? "" : answer).build()).build());
		}
		else if (type == SurveySchema.QuestionType.Score) {
			// 评分题没有选项也没有答案：星数由 attribute.scope 决定（见 buildAttribute）
		}
		else if (type == SurveySchema.QuestionType.Nps || type == SurveySchema.QuestionType.Upload) {
			// 设计器给 NPS / 上传题各留一个空 children：后端有取 getChildren().get(0) 的地方
			children.add(emptyChild());
			if (type == SurveySchema.QuestionType.Upload && StringUtils.hasText(answer)) {
				// 上传题没有机器答案：答案列当「参考答案/示例说明」保留
				setUploadReference(children, answer);
			}
		}
		else if (isMatrix(type)) {
			rows = parseMatrix(type, extras, answer, children, dataSources, serial);
			if (rows == null) {
				return null;
			}
		}
		else {
			parseBlank(type, stem, answer, children, serial);
		}

		SurveySchema.Attribute attribute = buildAttribute(type, metaScore == null ? scoreText.score : metaScore,
				analysis);
		SurveySchema question = SurveySchema.builder().id(newId()).title(stem).type(type).attribute(attribute)
				.children(children).dataSource(dataSources.isEmpty() ? null : dataSources).row(rows)
				.tags(parseTags(tags)).chapter(chapter).difficulty(difficulty).build();
		if (isMatrix(type) && StringUtils.hasText(answer)) {
			// 矩阵题不参与自动判分（前端 EXAM_TYPES 也不含矩阵）：答案原样保留，行之间 |，行内多选 ,
			question.getAttribute().setExamCorrectAnswer(answer.trim());
		}

		return new Parsed(false, stem, question);
	}

	private void parseChoice(SurveySchema.QuestionType type, List<String> extras, String answer,
			List<SurveySchema> children, List<SurveySchema.DataSource> dataSources, int serial) {
		List<Option> options = new ArrayList<>();
		for (String line : extras) {
			boolean flagged = CORRECT_FLAG.matcher(line).find();
			String text = CORRECT_FLAG.matcher(line).replaceAll("").trim();
			Matcher prefix = OPTION_PREFIX.matcher(text);
			if (prefix.matches()) {
				text = prefix.group(2).trim();
			}
			if (!StringUtils.hasText(text)) {
				continue;
			}
			options.add(new Option(text, flagged));
		}

		if (type == SurveySchema.QuestionType.Judge && options.isEmpty()) {
			options.add(new Option("正确", false));
			options.add(new Option("错误", false));
		}

		applyAnswer(type, options, answer);

		if (options.stream().noneMatch(option -> option.correct)) {
			warn("warn", "ANSWER_MISSING", "第 " + serial + " 题没有识别到正确答案");
		}

		for (Option option : options) {
			String optionId = newId();
			children.add(SurveySchema.builder().id(optionId).title(option.text).type(SurveySchema.QuestionType.Option)
					.attribute(SurveySchema.Attribute.builder()
							.examCorrectAnswer(option.correct ? optionId : null).build())
					.build());
			SurveySchema.DataSource dataSource = new SurveySchema.DataSource();
			dataSource.setLabel(option.text);
			dataSource.setValue(optionId);
			dataSources.add(dataSource);
		}
	}

	private void applyAnswer(SurveySchema.QuestionType type, List<Option> options, String answer) {
		if (!StringUtils.hasText(answer)) {
			return;
		}
		if (type == SurveySchema.QuestionType.Judge) {
			String normalized = answer.trim().toLowerCase(Locale.ROOT);
			boolean positive = "对".equals(normalized) || "正确".equals(normalized) || "true".equals(normalized)
					|| "√".equals(normalized) || "是".equals(normalized) || "a".equals(normalized);
			boolean negative = "错".equals(normalized) || "错误".equals(normalized) || "false".equals(normalized)
					|| "×".equals(normalized) || "否".equals(normalized) || "b".equals(normalized);
			if (positive && !options.isEmpty()) {
				options.get(0).correct = true;
			}
			else if (negative && options.size() > 1) {
				options.get(1).correct = true;
			}
			return;
		}
		Set<Character> letters = new HashSet<>();
		for (char ch : answer.toUpperCase(Locale.ROOT).toCharArray()) {
			if (ch >= 'A' && ch <= 'H') {
				letters.add(ch);
			}
		}
		if (letters.isEmpty()) {
			return;
		}
		for (int i = 0; i < options.size(); i++) {
			options.get(i).correct = letters.contains((char) ('A' + i));
		}
	}

	private void parseBlank(SurveySchema.QuestionType type, String stem, String answer, List<SurveySchema> children,
			int serial) {
		int blanks = countBlanks(stem);
		if (type == SurveySchema.QuestionType.FillBlank && blanks == 0) {
			blanks = 1;
		}
		if (blanks == 0) {
			blanks = 1;
		}
		String[] parts = answer == null ? new String[0] : answer.split("[|｜]");
		if (parts.length != blanks) {
			warn("warn", "BLANK_COUNT_MISMATCH",
					"第 " + serial + " 题有 " + blanks + " 个空，但答案给了 " + parts.length + " 段");
		}
		for (int i = 0; i < blanks; i++) {
			String value = i < parts.length ? parts[i].trim() : "";
			// 同一空允许多个可接受答案：按判分器的约定用换行分隔
			value = value.replace("&", "\n").replace("＆", "\n");
			children.add(SurveySchema.builder().id(newId())
					.attribute(SurveySchema.Attribute.builder().examCorrectAnswer(value).build()).build());
		}
	}

	/**
	 * 矩阵题：标记之后用若干行「行：xxx」「列：xxx」定义行与列。
	 *
	 * <p>
	 * 生成的结构与设计器一致：行放 {@code row}，列放 {@code dataSource} + {@code children}（Option 节点）。
	 * 答案按行写、行之间用 {@code |}，行内多选用 {@code ,}。
	 */
	private List<SurveySchema.Row> parseMatrix(SurveySchema.QuestionType type, List<String> extras, String answer,
			List<SurveySchema> children, List<SurveySchema.DataSource> dataSources, int serial) {
		List<String> rowTitles = new ArrayList<>();
		List<String> columnTitles = new ArrayList<>();
		for (String line : extras) {
			String text = line.trim();
			Matcher rowMatcher = MATRIX_ROW.matcher(text);
			if (rowMatcher.matches()) {
				if (StringUtils.hasText(rowMatcher.group(1))) {
					rowTitles.add(rowMatcher.group(1).trim());
				}
				continue;
			}
			Matcher columnMatcher = MATRIX_COLUMN.matcher(text);
			if (columnMatcher.matches() && StringUtils.hasText(columnMatcher.group(1))) {
				columnTitles.add(columnMatcher.group(1).trim());
			}
		}
		if (rowTitles.isEmpty() || columnTitles.isEmpty()) {
			warn("warn", "MATRIX_TITLES_MISSING",
					"第 " + serial + " 题是矩阵题，但没有识别到「行：」「列：」，已跳过");
			return null;
		}

		List<SurveySchema.Row> rows = new ArrayList<>();
		for (String title : rowTitles) {
			SurveySchema.Row row = new SurveySchema.Row();
			row.setId(newId());
			row.setTitle(title);
			rows.add(row);
		}
		for (String title : columnTitles) {
			String columnId = newId();
			children.add(SurveySchema.builder().id(columnId).title(title)
					.type(SurveySchema.QuestionType.Option)
					.attribute(SurveySchema.Attribute.builder().build()).build());
			dataSources.add(new SurveySchema.DataSource(title, columnId, null));
		}

		if ((type == SurveySchema.QuestionType.MatrixRadio || type == SurveySchema.QuestionType.MatrixCheckbox)
				&& StringUtils.hasText(answer)) {
			int answerRows = matrixAnswerRows(answer);
			if (answerRows != rows.size()) {
				warn("warn", "MATRIX_ANSWER_MISMATCH", "第 " + serial + " 题答案有 " + answerRows + " 行，但「行：」写了 "
						+ rows.size() + " 行");
			}
		}
		return rows;
	}

	private int matrixAnswerRows(String answer) {
		return (int) Arrays.stream(answer.split("[|｜]")).map(String::trim).filter(StringUtils::hasText).count();
	}

	private boolean isMatrix(SurveySchema.QuestionType type) {
		return type == SurveySchema.QuestionType.MatrixRadio || type == SurveySchema.QuestionType.MatrixCheckbox
				|| type == SurveySchema.QuestionType.MatrixFillBlank;
	}

	/** 上传题的答案列当参考答案说明，挂到唯一那个空位节点上（渲染层不显示，判分也不看）。 */
	private void setUploadReference(List<SurveySchema> children, String answer) {
		if (children.isEmpty()) {
			return;
		}
		SurveySchema blank = children.get(0);
		SurveySchema.Attribute attribute = blank.getAttribute() == null ? new SurveySchema.Attribute()
				: blank.getAttribute();
		attribute.setExamCorrectAnswer(answer.trim());
		blank.setAttribute(attribute);
	}

	private SurveySchema emptyChild() {
		return SurveySchema.builder().id(newId()).type(SurveySchema.QuestionType.Option)
				.attribute(SurveySchema.Attribute.builder().build()).build();
	}

	// ------------------------------------------------------------------ 工具方法

	private SurveySchema.QuestionType resolveType(String marker, String stem, List<String> extras, String answer,
			int serial) {
		if (StringUtils.hasText(marker)) {
			String value = marker.replace("题", "").trim();
			String lower = value.toLowerCase(Locale.ROOT);
			// 矩阵题必须先判：矩阵单选里也含「单选」
			if (value.contains("矩阵")) {
				if (value.contains("单选") || value.contains("单项")) {
					return SurveySchema.QuestionType.MatrixRadio;
				}
				if (value.contains("多选") || value.contains("多项")) {
					return SurveySchema.QuestionType.MatrixCheckbox;
				}
				if (value.contains("填空")) {
					return SurveySchema.QuestionType.MatrixFillBlank;
				}
			}
			if (value.contains("单选") || value.contains("单项选择")) {
				return SurveySchema.QuestionType.Radio;
			}
			if (value.contains("多选") || value.contains("多项选择")) {
				return SurveySchema.QuestionType.Checkbox;
			}
			if (value.contains("判断")) {
				return SurveySchema.QuestionType.Judge;
			}
			if (value.contains("多项填空") || value.contains("多空填空")) {
				return SurveySchema.QuestionType.MultipleBlank;
			}
			if (value.contains("填空")) {
				return SurveySchema.QuestionType.FillBlank;
			}
			if (value.contains("简答") || value.contains("问答") || value.contains("解答") || value.contains("主观")) {
				return SurveySchema.QuestionType.Textarea;
			}
			if (value.contains("下拉")) {
				return SurveySchema.QuestionType.Select;
			}
			if (value.contains("评分") || value.contains("打分") || value.contains("星级")) {
				return SurveySchema.QuestionType.Score;
			}
			if (lower.contains("nps") || value.contains("净推荐")) {
				return SurveySchema.QuestionType.Nps;
			}
			if (value.contains("上传")) {
				return SurveySchema.QuestionType.Upload;
			}
			warn("warn", "TYPE_UNKNOWN", "第 " + serial + " 题的题型标记【" + marker + "】无法识别，已按内容推断");
		}

		if (extras.size() == 2 && isJudgeOption(extras.get(0)) && isJudgeOption(extras.get(1))) {
			return SurveySchema.QuestionType.Judge;
		}
		boolean hasFlag = extras.stream().anyMatch(line -> CORRECT_FLAG.matcher(line).find());
		boolean hasLetterAnswer = StringUtils.hasText(answer) && answer.toUpperCase(Locale.ROOT).matches(".*[A-H].*")
				&& !answer.matches(".*[\\u4e00-\\u9fa5].*");
		if (hasFlag || (hasLetterAnswer && extras.size() >= 2)) {
			return inferChoice(extras, answer);
		}
		if (countBlanks(stem) > 0) {
			return countBlanks(stem) > 1 ? SurveySchema.QuestionType.MultipleBlank
					: SurveySchema.QuestionType.FillBlank;
		}
		if (StringUtils.hasText(answer) && extras.isEmpty()) {
			warn("info", "TYPE_INFERRED", "第 " + serial + " 题未写题型，已按简答题处理");
			return SurveySchema.QuestionType.Textarea;
		}
		if (!extras.isEmpty()) {
			warn("info", "TYPE_INFERRED", "第 " + serial + " 题未写题型，已按单选题处理");
			return SurveySchema.QuestionType.Radio;
		}
		warn("warn", "TYPE_UNKNOWN", "第 " + serial + " 题无法判断题型，已按简答题处理");
		return SurveySchema.QuestionType.Textarea;
	}

	private SurveySchema.QuestionType inferChoice(List<String> extras, String answer) {
		long flagged = extras.stream().filter(line -> CORRECT_FLAG.matcher(line).find()).count();
		long letters = 0;
		if (StringUtils.hasText(answer)) {
			letters = answer.toUpperCase(Locale.ROOT).chars().filter(ch -> ch >= 'A' && ch <= 'H').count();
		}
		if (flagged > 1 || letters > 1) {
			return SurveySchema.QuestionType.Checkbox;
		}
		return SurveySchema.QuestionType.Radio;
	}

	private SurveySchema.Attribute buildAttribute(SurveySchema.QuestionType type, double score, String analysis) {
		SurveySchema.Attribute attribute = SurveySchema.Attribute.builder().examScore(score).examAnalysis(analysis)
				.required(false).build();
		switch (type) {
			case Radio:
			case Judge:
			case Select:
				attribute.setExamAnswerMode(SurveySchema.ExamScoreMode.onlyOne);
				break;
			case Checkbox:
				attribute.setExamAnswerMode(SurveySchema.ExamScoreMode.selectAll);
				break;
			case FillBlank:
			case MultipleBlank:
				attribute.setExamAnswerMode(SurveySchema.ExamScoreMode.selectAll);
				attribute.setExamMatchRule(SurveySchema.ExamMatchRule.completeSame);
				break;
			case Textarea:
				attribute.setExamAnswerMode(SurveySchema.ExamScoreMode.manual);
				break;
			case Score:
				// 前端 Score 组件的星数取 scope 上限
				attribute.setScope("[0," + (int) Math.round(score) + "]");
				attribute.setExamAnswerMode(SurveySchema.ExamScoreMode.none);
				break;
			case Nps:
				attribute.setNpsStartNum(0);
				attribute.setNpsTotalNum(11);
				attribute.setExamAnswerMode(SurveySchema.ExamScoreMode.none);
				break;
			case MatrixRadio:
			case MatrixCheckbox:
			case MatrixFillBlank:
				attribute.setExamAnswerMode(SurveySchema.ExamScoreMode.none);
				break;
			case Upload:
				// 与设计器默认值一致；前端 Upload 组件读的是 maxFileCount / maxFileSize
				attribute.setMaxFileCount(1);
				attribute.setMaxFileSize(5D);
				attribute.setExamAnswerMode(SurveySchema.ExamScoreMode.none);
				break;
			default:
				break;
		}
		return attribute;
	}

	private List<String> parseTags(String tags) {
		if (!StringUtils.hasText(tags)) {
			return null;
		}
		List<String> result = new ArrayList<>();
		for (String tag : tags.split("[\\s,，、;；]+")) {
			if (StringUtils.hasText(tag)) {
				result.add(tag.trim());
			}
		}
		return result.isEmpty() ? null : result;
	}

	/** 首行是否像“试卷标题”：不是题型标记、不是题号、不是字段行、不是选项、不以句号问号结尾。 */
	public static boolean looksLikeTitle(String line) {
		String value = line.trim();
		return StringUtils.hasText(value) && !MARKER.matcher(value).find() && !QUESTION_NO.matcher(value).find()
				&& !META.matcher(value).matches() && !OPTION_PREFIX.matcher(value).matches()
				&& !value.contains("（正确答案）") && !value.matches(".*[。？！?!]$") && !value.contains("____")
				&& value.length() <= 80;
	}

	private boolean isJudgeOption(String text) {
		String value = CORRECT_FLAG.matcher(text).replaceAll("").trim().toLowerCase(Locale.ROOT);
		return "正确".equals(value) || "错误".equals(value) || "对".equals(value) || "错".equals(value)
				|| "true".equals(value) || "false".equals(value) || "√".equals(value) || "×".equals(value);
	}

	private boolean isWelcome(String marker) {
		return marker != null && (marker.contains("欢迎") || marker.contains("说明") || marker.contains("描述"));
	}

	private double scoreOf(Matcher matcher) {
		return Double.parseDouble(matcher.group(1));
	}

	private Double parseScore(String value) {
		if (!StringUtils.hasText(value)) {
			return null;
		}
		try {
			return Double.parseDouble(value.trim());
		}
		catch (NumberFormatException e) {
			return null;
		}
	}

	private ScoreText extractScore(String text) {
		Matcher matcher = SCORE.matcher(text);
		if (matcher.find()) {
			double score = scoreOf(matcher);
			return new ScoreText(matcher.replaceAll("").trim(), score);
		}
		return new ScoreText(text, 5D);
	}

	private String cleanStem(String text) {
		if (text == null) {
			return "";
		}
		String value = text.replace("\uFEFF", "").trim();
		Matcher matcher = QUESTION_NO.matcher(value);
		if (matcher.find()) {
			value = value.substring(matcher.end()).trim();
		}
		return value;
	}

	private int countBlanks(String stem) {
		int count = 0;
		Matcher matcher = BLANK_TOKEN.matcher(stem);
		while (matcher.find()) {
			count++;
		}
		return count;
	}

	private List<String> splitLines(String text) {
		String normalized = text.replace("\r\n", "\n").replace("\r", "\n");
		return new ArrayList<>(Arrays.asList(normalized.split("\n", -1)));
	}

	private int firstNonBlank(List<String> lines) {
		for (int i = 0; i < lines.size(); i++) {
			if (StringUtils.hasText(lines.get(i))) {
				return i;
			}
		}
		return -1;
	}

	private List<List<String>> splitBlocks(List<String> lines, int from) {
		List<List<String>> blocks = new ArrayList<>();
		List<String> current = new ArrayList<>();
		for (int i = from; i < lines.size(); i++) {
			String line = lines.get(i);
			boolean blank = !StringUtils.hasText(line);
			boolean markerStart = MARKER.matcher(line).find() && !current.isEmpty();
			if (blank || markerStart) {
				if (!current.isEmpty()) {
					blocks.add(current);
					current = new ArrayList<>();
				}
				if (blank) {
					continue;
				}
			}
			current.add(line);
		}
		if (!current.isEmpty()) {
			blocks.add(current);
		}
		return blocks;
	}

	private String newId() {
		return NanoIdUtils.randomNanoId(6, ids);
	}

	private void warn(String level, String code, String message) {
		warnings.add(ImportPreview.Warning.builder().level(level).code(code).message(message).build());
	}

	// ------------------------------------------------------------------ 内部结构

	private static final class Option {

		private final String text;

		private boolean correct;

		private Option(String text, boolean correct) {
			this.text = text;
			this.correct = correct;
		}

	}

	private static final class ScoreText {

		private final String text;

		private final double score;

		private ScoreText(String text, double score) {
			this.text = text;
			this.score = score;
		}

	}

	private static final class Parsed {

		private final boolean welcome;

		private final String stem;

		private final SurveySchema schema;

		private Parsed(boolean welcome, String stem, SurveySchema schema) {
			this.welcome = welcome;
			this.stem = stem;
			this.schema = schema;
		}

		private static Parsed welcome(String stem) {
			return new Parsed(true, stem, null);
		}

	}

}
