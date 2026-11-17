package cn.surveyking.server.core.uitls;

import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiConsumer;
import java.util.stream.Collectors;

/**
 * 国际化辅助，统一管理题库 Excel 模板的 sheet 名称和表头
 */
public final class RepoTemplateI18n {

	private static final ResourceBundleMessageSource MESSAGE_SOURCE = initMessageSource();

	private static final List<Locale> SUPPORTED_LOCALES = Arrays.asList(Locale.SIMPLIFIED_CHINESE, Locale.CHINA,
			Locale.ENGLISH, Locale.US);

	private static final Map<String, Set<String>> ALIAS_CACHE = new ConcurrentHashMap<>();

	/** 选项列后缀：选项 A ~ 选项 H */
	private static final List<String> OPTION_SUFFIXES = Arrays.asList("A", "B", "C", "D", "E", "F", "G", "H");

	/** 填空列序号：空 1 ~ 空 8 */
	private static final List<String> BLANK_INDEXES = Arrays.asList("1", "2", "3", "4", "5", "6", "7", "8");

	/** 矩阵行/列标题列数上限：行标题1 ~ 行标题10、列标题1 ~ 列标题10 */
	private static final int MAX_MATRIX_TITLE_INDEX = 10;

	private RepoTemplateI18n() {
	}

	private static ResourceBundleMessageSource initMessageSource() {
		ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
		messageSource.setBasenames("messages");
		messageSource.setDefaultEncoding("UTF-8");
		messageSource.setFallbackToSystemLocale(false);
		return messageSource;
	}

	private static String normalize(String value) {
		if (value == null) {
			return null;
		}
		// 全角括号按半角处理：「选项树（JSON）」与「选项树(JSON)」视为同一列
		return value.replace('（', '(').replace('）', ')').replaceAll("[\\s\\u00A0\\u3000]+", "")
				.toLowerCase(Locale.ROOT);
	}

	private static Set<String> getAliases(String key, String defaultMessage) {
		return ALIAS_CACHE.computeIfAbsent(key, k -> buildAliases(key, defaultMessage, null));
	}

	private static Set<String> getAliases(String key, String defaultMessage, Object[] args) {
		String cacheKey = key + Arrays.deepToString(args);
		return ALIAS_CACHE.computeIfAbsent(cacheKey, k -> buildAliases(key, defaultMessage, args));
	}

	private static Set<String> buildAliases(String key, String defaultMessage, Object[] args) {
		Set<String> aliases = new LinkedHashSet<>();
		for (Locale locale : SUPPORTED_LOCALES) {
			String message = MESSAGE_SOURCE.getMessage(key, args, defaultMessage, locale);
			if (StringUtils.hasText(message)) {
				aliases.add(normalize(message));
			}
		}
		if (StringUtils.hasText(defaultMessage)) {
			aliases.add(normalize(defaultMessage));
		}
		return aliases.stream().filter(Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
	}

	private static boolean matches(String input, Set<String> aliases) {
		return input != null && aliases.contains(normalize(input));
	}

	/**
	 * 表头写作「选项树(JSON)」「选项树（JSON）」「高级配置(JSON)」都算命中：表头里带不带 (JSON) 后缀不影响识别。
	 */
	private static boolean matchesJsonSuffix(String input, Set<String> aliases) {
		String normalized = normalize(input);
		if (normalized == null) {
			return false;
		}
		for (String alias : aliases) {
			if (normalized.equals(alias + "(json)") || normalized.equals(alias + "json")) {
				return true;
			}
		}
		return false;
	}

	public static String message(String key, String defaultMessage) {
		return MESSAGE_SOURCE.getMessage(key, null, defaultMessage, LocaleContextHolder.getLocale());
	}

	public static String message(String key, String defaultPattern, Object... args) {
		return MESSAGE_SOURCE.getMessage(key, args, defaultPattern, LocaleContextHolder.getLocale());
	}

	public static boolean isOptionColumn(String cellText) {
		return matches(cellText, OptionHeader.ALL_LABELS);
	}

	/**
	 * 选项列表头对应的字母（A ~ H），不是选项列返回 null。定位用列名而非列号，老师插列不会错位。
	 */
	public static String optionSuffix(String cellText) {
		String normalized = normalize(cellText);
		return normalized == null ? null : OptionHeader.LABEL_TO_SUFFIX.get(normalized);
	}

	public static boolean isBlankColumn(String cellText) {
		return matches(cellText, BlankHeader.ALL_LABELS);
	}

	public static String optionLabel(String suffix) {
		return message("repo.template.header.option", "选项{0}", suffix);
	}

	public static String blankLabel(String index) {
		return message("repo.template.header.blank", "空{0}", index);
	}

	public static String rowTitleLabel(String index) {
		return message("repo.template.header.rowTitle", "行标题{0}", index);
	}

	public static String columnTitleLabel(String index) {
		return message("repo.template.header.columnTitle", "列标题{0}", index);
	}

	public static String optionTreeLabel() {
		return message("repo.template.header.optionTree", "选项树");
	}

	public static String advancedJsonLabel() {
		return message("repo.template.header.advancedJson", "高级配置");
	}

	/**
	 * 矩阵行标题列（行标题1 ~ 行标题10）的序号，不是这类表头返回 null。
	 */
	public static Integer rowTitleIndex(String cellText) {
		return lookup(MatrixTitleHeader.ROW_LABELS, cellText);
	}

	/**
	 * 矩阵列标题列（列标题1 ~ 列标题10）的序号，不是这类表头返回 null。
	 */
	public static Integer columnTitleIndex(String cellText) {
		return lookup(MatrixTitleHeader.COLUMN_LABELS, cellText);
	}

	private static Integer lookup(Map<String, Integer> labels, String cellText) {
		String normalized = normalize(cellText);
		return normalized == null ? null : labels.get(normalized);
	}

	public static String workbookName() {
		return message("repo.template.workbook.name", "题库");
	}

	private static class OptionHeader {

		private static final Map<String, String> LABEL_TO_SUFFIX = buildLabelToSuffix();

		private static final Set<String> ALL_LABELS = LABEL_TO_SUFFIX.keySet();

		private static Map<String, String> buildLabelToSuffix() {
			Map<String, String> labels = new LinkedHashMap<>();
			for (String suffix : OPTION_SUFFIXES) {
				for (String alias : getAliases("repo.template.header.option", "选项{0}", new Object[] { suffix })) {
					labels.put(alias, suffix);
				}
			}
			return labels;
		}

	}

	private static class BlankHeader {

		private static final Set<String> ALL_LABELS = BLANK_INDEXES.stream()
				.flatMap(index -> getAliases("repo.template.header.blank", "空{0}", new Object[] { index }).stream())
				.collect(Collectors.toCollection(LinkedHashSet::new));

	}

	/**
	 * 矩阵行/列标题：行标题1..10、列标题1..10（另外兼容短写「行1」「列1」）。
	 */
	private static class MatrixTitleHeader {

		private static final Map<String, Integer> ROW_LABELS = build("repo.template.header.rowTitle", "行标题{0}",
				"行{0}");

		private static final Map<String, Integer> COLUMN_LABELS = build("repo.template.header.columnTitle",
				"列标题{0}", "列{0}");

		private static Map<String, Integer> build(String key, String defaultLabel, String shortLabel) {
			Map<String, Integer> labels = new LinkedHashMap<>();
			for (int i = 1; i <= MAX_MATRIX_TITLE_INDEX; i++) {
				String index = String.valueOf(i);
				for (String alias : getAliases(key, defaultLabel, new Object[] { index })) {
					labels.put(alias, i);
				}
				labels.put(normalize(shortLabel.replace("{0}", index)), i);
			}
			return labels;
		}

	}

	public enum SheetType {

		SINGLE_CHOICE("repo.template.sheet.singleChoice", "单选题"), MULTIPLE_CHOICE("repo.template.sheet.multipleChoice",
				"多选题"), TRUE_FALSE("repo.template.sheet.trueFalse", "判断题"), FILL_BLANK(
						"repo.template.sheet.fillBlank", "填空题"), TEXTAREA("repo.template.sheet.textarea", "简答题"),
		/** 下拉单选 */
		SELECT("repo.template.sheet.select", "下拉题"),
		/** 评分（星级） */
		SCORE("repo.template.sheet.score", "评分题"),
		/** NPS 净推荐值 */
		NPS("repo.template.sheet.nps", "NPS题"),
		/** 级联选择 */
		CASCADER("repo.template.sheet.cascader", "级联题"),
		/** 矩阵单选 */
		MATRIX_RADIO("repo.template.sheet.matrixRadio", "矩阵单选题"),
		/** 矩阵多选 */
		MATRIX_CHECKBOX("repo.template.sheet.matrixCheckbox", "矩阵多选题"),
		/** 上传题（前端 registerAll 里已注册的题型；矩阵评分题 MatrixScore 没有渲染器，不做） */
		UPLOAD("repo.template.sheet.upload", "上传题"),
		/** 矩阵填空 */
		MATRIX_FILL_BLANK("repo.template.sheet.matrixFillBlank", "矩阵填空题");

		private final String key;

		private final String defaultLabel;

		private final Set<String> aliases;

		SheetType(String key, String defaultLabel) {
			this.key = key;
			this.defaultLabel = defaultLabel;
			this.aliases = getAliases(key, defaultLabel);
		}

		public String displayName() {
			return message(key, defaultLabel);
		}

		/**
		 * 导出 xlsx 时的 sheet 名：固定用内置中文名，不走当前语言。
		 *
		 * <p>两个原因：一是 Excel 的 sheet 名不允许 {@code / \ ? * [ ] :}，英文名 "True / False" 会被
		 * fastexcel <b>静默</b>改写成 "True - False"，导入按名字匹配就找不到这张表（判断题整类丢失）；
		 * 二是导出/导入/模板三处用同一个名字，老师看到的和文档写的一致。
		 */
		public String exportName() {
			return defaultLabel;
		}

		public boolean matches(String name) {
			if (RepoTemplateI18n.matches(name, aliases)) {
				return true;
			}
			// 兼容历史导出：Excel 把非法字符替换成 -，再把它换回 / 比一次（"True - False" → "True / False"）
			String normalized = normalize(name);
			return normalized != null && RepoTemplateI18n.matches(normalized.replace('-', '/'), aliases);
		}

		public static SheetType fromName(String name) {
			return Arrays.stream(values()).filter(type -> type.matches(name)).findFirst().orElse(null);
		}

	}

	public enum HeaderLabel {

		SERIAL_NO("repo.template.header.serialNo", "序号", (map, index) -> map.put("serialNo", index)), CHAPTER(
				"repo.template.header.chapter", "章节", (map, index) -> map.put("chapter", index)), DIFFICULTY(
						"repo.template.header.difficulty", "难度", (map, index) -> map.put("difficulty", index)), TITLE(
								"repo.template.header.title", "题干",
								(map, index) -> map.put("title", index)), ANALYSIS("repo.template.header.analysis", "解析",
										(map, index) -> map.put("examAnalysis", index)), SCORE(
												"repo.template.header.score", "分数",
												(map, index) -> map.put("examScore", index)), SINGLE_BLANK_SCORE(
														"repo.template.header.singleBlankScore", "单空分数",
														(map, index) -> map.put("examScore", index)), ANSWER(
																"repo.template.header.answer", "答案",
																(map, index) -> map.put("examCorrectAnswer", index)), TAGS(
																		"repo.template.header.tags", "标签",
																		(map, index) -> map.put("tags", index)),
		/** 级联题的选项树（JSON 数组），整列内容就是 dataSource */
		OPTION_TREE("repo.template.header.optionTree", "选项树", (map, index) -> map.put("optionTree", index), true),
		/** 通用兜底列：一个 JSON 对象，深度合并到该行生成的题目上 */
		ADVANCED_JSON("repo.template.header.advancedJson", "高级配置", (map, index) -> map.put("advancedJson", index),
				true);

		private final String key;

		private final String defaultLabel;

		private final Set<String> aliases;

		private final BiConsumer<Map<String, Integer>, Integer> mapper;

		/** 表头允许带 (JSON) 后缀：选项树(JSON) / 高级配置(JSON) */
		private final boolean jsonTolerant;

		HeaderLabel(String key, String defaultLabel, BiConsumer<Map<String, Integer>, Integer> mapper) {
			this(key, defaultLabel, mapper, false);
		}

		HeaderLabel(String key, String defaultLabel, BiConsumer<Map<String, Integer>, Integer> mapper,
				boolean jsonTolerant) {
			this.key = key;
			this.defaultLabel = defaultLabel;
			this.aliases = getAliases(key, defaultLabel);
			this.mapper = mapper;
			this.jsonTolerant = jsonTolerant;
		}

		public boolean matches(String name) {
			if (RepoTemplateI18n.matches(name, aliases)) {
				return true;
			}
			return jsonTolerant && matchesJsonSuffix(name, aliases);
		}

		public void apply(Map<String, Integer> target, int columnIndex) {
			mapper.accept(target, columnIndex);
		}

		public String displayLabel() {
			return message(key, defaultLabel);
		}

		public static HeaderLabel fromText(String text) {
			return Arrays.stream(values()).filter(label -> label.matches(text)).findFirst().orElse(null);
		}

	}

}
