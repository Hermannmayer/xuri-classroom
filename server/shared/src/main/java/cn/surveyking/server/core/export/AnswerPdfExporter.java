package cn.surveyking.server.core.export;

import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.SurveySchema.QuestionType;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.state.RenderingMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

































public final class AnswerPdfExporter {

	private static final Logger log = LoggerFactory.getLogger(AnswerPdfExporter.class);


	public static final String FONT_RESOURCE = "/fonts/answer-pdf.ttf";


	public static final String FONT_MISSING_MESSAGE = "答卷 PDF 字体未安装，请重新部署或联系管理员";


	private static final byte[] FONT_BYTES = readFontBytes();



	private static final float MARGIN_LEFT = 48f;

	private static final float MARGIN_RIGHT = 48f;

	private static final float MARGIN_TOP = 44f;


	private static final float MARGIN_BOTTOM = 54f;

	private static final float FOOTER_BASELINE = 26f;



	private static final float TITLE_SIZE = 17f;

	private static final float SUBTITLE_SIZE = 9.5f;

	private static final float SECTION_SIZE = 12f;

	private static final float QUESTION_SIZE = 11f;

	private static final float ANSWER_SIZE = 10f;

	private static final float META_SIZE = 8.5f;

	private static final float SCORE_BIG_SIZE = 22f;



	private static final Color COLOR_TEXT = new Color(0x22, 0x22, 0x22);

	private static final Color COLOR_SOFT = new Color(0x6b, 0x6b, 0x6b);

	private static final Color COLOR_LINE = new Color(0xd8, 0xd8, 0xd8);

	private static final Color COLOR_CARD = new Color(0xf4, 0xf4, 0xf4);

	private static final Color COLOR_CORRECT = new Color(0x1a, 0x7f, 0x37);

	private static final Color COLOR_WRONG = new Color(0xb3, 0x26, 0x1e);

	private static final Color COLOR_PARTIAL = new Color(0xb2, 0x6a, 0x00);

	private static final Color COLOR_MINE = new Color(0x1c, 0x4d, 0x8f);




	private static final float IMAGE_MAX_WIDTH = 300f;

	private static final float IMAGE_MAX_HEIGHT = 240f;


	private static final int IMAGE_MAX_PIXEL_WIDTH = 800;

	private static final double EPS = 0.005d;


	private static final Map<Integer, Float> WIDTH_CACHE = new ConcurrentHashMap<>();




	private static final float SHEET_LINE_RATIO = 1.62f;


	private static final float SHEET_BODY_INDENT = 14f;


	private static final float SHEET_OPTION_HANG = 12f;


	private static final float SHEET_BLOCK_PADDING = 12f;


	private static final float SHEET_BLOCK_GAP = 4f;


	private static final float SHEET_BOX_RATIO = 0.66f;


	private static final float SHEET_QUESTION_GAP = 12f;

	private AnswerPdfExporter() {
	}

	/** 字体是否可用：任务创建阶段用它提前给出明确的部署错误，而不是让 50 份任务全失败 */
	public static boolean isFontAvailable() {
		return FONT_BYTES != null && FONT_BYTES.length > 0;
	}

	/**
	 * 字体字节（包内可见）。成绩确认单等同样要嵌入这份 TTF 的渲染器直接复用，
	 * 免得为了一个 12.6MB 的子集字体再读一次资源。
	 */
	static byte[] fontBytes() {
		return FONT_BYTES;
	}

	/**
	 * 渲染单份答卷。
	 * @param project 试卷（只用 id/name/category/survey/setting，调用方可以从 Project 模型转换）
	 * @param answer 答卷视图（需要 answer 原文、metaInfo、examInfo、examScore、answererName 等）
	 * @param options 导出选项（轮次、是否含解析/图片、班级名、图片加载回调）
	 * @return PDF 字节内容
	 */
	public static byte[] renderAnswer(ProjectView project, AnswerView answer, PdfOptions options) {
		if (!isFontAvailable()) {
			throw new InternalServerError(FONT_MISSING_MESSAGE);
		}
		if (project == null || answer == null) {
			throw new InternalServerError("生成答卷 PDF 失败：缺少试卷或答卷数据");
		}
		PdfOptions opts = options == null ? new PdfOptions() : options;

		try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024)) {

			PDType0Font font = PDType0Font.load(doc, new ByteArrayInputStream(FONT_BYTES), true);
			Layout layout = new Layout(doc, font, opts.isShowPageFooter());
			try {
				doc.getDocumentInformation().setTitle(displayTitle(project, answer));
				doc.getDocumentInformation().setCreator("SurveyKing");
				doc.getDocumentInformation().setProducer("SurveyKing / Apache PDFBox");
				List<QuestionItem> questions = collectQuestions(project.getSurvey());
				if (opts.getStyle() == Style.ANSWER_SHEET) {

					drawAnswerSheet(layout, answer, opts, questions);
				}
				else {

					AnswerStats stats = buildStats(questions, answer);
					drawHeader(layout, project, answer, opts);
					drawInfoCard(layout, answer, opts, stats);
					drawSectionTitle(layout, "答题解析");
					for (QuestionItem item : questions) {
						drawQuestion(layout, item, answer, opts);
					}
				}
				layout.finish();
				doc.save(out);
				return out.toByteArray();
			}
			finally {
				layout.close();
			}
		}
		catch (InternalServerError e) {
			throw e;
		}
		catch (IOException e) {
			throw new InternalServerError("生成答卷 PDF 失败：" + e.getMessage(), e);
		}
	}









	public enum Style {


		GRADE_REPORT,


		ANSWER_SHEET

	}






	public static final class PdfOptions {


		private Integer attemptNo;


		private boolean includeAnalysis;


		private boolean includeImages;


		private String classLabel;


		private Function<String, byte[]> imageLoader;


		private Style style = Style.GRADE_REPORT;







		private boolean showPageFooter = true;


		public PdfOptions attemptNo(Integer attemptNo) {
			this.attemptNo = attemptNo;
			return this;
		}

		public PdfOptions includeAnalysis(boolean includeAnalysis) {
			this.includeAnalysis = includeAnalysis;
			return this;
		}

		public PdfOptions includeImages(boolean includeImages) {
			this.includeImages = includeImages;
			return this;
		}

		public PdfOptions classLabel(String classLabel) {
			this.classLabel = classLabel;
			return this;
		}

		public PdfOptions imageLoader(Function<String, byte[]> imageLoader) {
			this.imageLoader = imageLoader;
			return this;
		}

		/** 传 null 按成绩单处理：调用方从请求参数翻过来的枚举可能是空的 */
		public PdfOptions style(Style style) {
			this.style = style == null ? Style.GRADE_REPORT : style;
			return this;
		}

		public PdfOptions showPageFooter(boolean showPageFooter) {
			this.showPageFooter = showPageFooter;
			return this;
		}

		public boolean isShowPageFooter() {
			return showPageFooter;
		}

		public Integer getAttemptNo() {
			return attemptNo;
		}

		public boolean isIncludeAnalysis() {
			return includeAnalysis;
		}

		public boolean isIncludeImages() {
			return includeImages;
		}

		public String getClassLabel() {
			return classLabel;
		}

		public Function<String, byte[]> getImageLoader() {
			return imageLoader;
		}

		public Style getStyle() {
			return style;
		}

		/**
		 * 复制一份选项。长图导出要在副本上把版式强制成「答题卷」，不能改调用方手里那份
		 * （同一个对象可能还要拿去导成绩单）。
		 */
		public PdfOptions copy() {
			PdfOptions copy = new PdfOptions();
			copy.attemptNo = attemptNo;
			copy.includeAnalysis = includeAnalysis;
			copy.includeImages = includeImages;
			copy.classLabel = classLabel;
			copy.imageLoader = imageLoader;
			copy.style = style;
			copy.showPageFooter = showPageFooter;
			return copy;
		}

	}




	private static final class QuestionItem {

		private final SurveySchema schema;

		private final String heading;

		private final int number;

		private QuestionItem(SurveySchema schema, String heading, int number) {
			this.schema = schema;
			this.heading = heading;
			this.number = number;
		}

	}

	/**
	 * 按卷面顺序展开题目：只给 dataType 编号；QuestionSet 当大题标题；
	 * Pagination/Survey 只往下钻；SplitLine/Option/RandomSurvey 不显示。
	 */
	private static List<QuestionItem> collectQuestions(SurveySchema survey) {
		List<QuestionItem> result = new ArrayList<>();
		if (survey == null) {
			return result;
		}

		collectChildren(survey, result, new int[] { 0 }, null);
		return result;
	}

	private static void collectQuestions(SurveySchema node, List<QuestionItem> out, int[] number, String heading) {
		if (node == null) {
			return;
		}
		if (node.getType() == null) {

			collectChildren(node, out, number, heading);
			return;
		}
		QuestionType type = node.getType();
		if (type == QuestionType.Survey || type == QuestionType.Pagination) {
			collectChildren(node, out, number, heading);
			return;
		}
		if (type == QuestionType.QuestionSet) {
			String title = SchemaHelper.trimHtmlTag(node.getTitle());
			if (hasText(title)) {
				out.add(new QuestionItem(null, title, 0));
			}
			collectChildren(node, out, number, title);
			return;
		}
		if (type == QuestionType.Remark) {
			String title = SchemaHelper.trimHtmlTag(node.getTitle());
			if (hasText(title)) {
				out.add(new QuestionItem(null, title, 0));
			}
			return;
		}
		if (type == QuestionType.SplitLine || type == QuestionType.Option || type == QuestionType.RandomSurvey) {
			return;
		}
		if (QuestionType.dataType().contains(type)) {
			number[0] = number[0] + 1;
			out.add(new QuestionItem(node, null, number[0]));
			return;
		}
		collectChildren(node, out, number, heading);
	}

	private static void collectChildren(SurveySchema node, List<QuestionItem> out, int[] number, String heading) {
		List<SurveySchema> children = node.getChildren();
		if (children == null) {
			return;
		}
		for (SurveySchema child : children) {
			collectQuestions(child, out, number, heading);
		}
	}



	private static final class AnswerStats {

		private int questionCount;

		private int scoredCount;

		private int correctCount;

		private Double maxScore;


		private boolean manualPending;

	}

	private static AnswerStats buildStats(List<QuestionItem> questions, AnswerView answer) {
		AnswerStats stats = new AnswerStats();
		double maxTotal = 0d;
		boolean hasMax = false;
		boolean graded = "graded".equals(answer.getGradeStatus());
		for (QuestionItem item : questions) {
			if (item.schema == null) {
				continue;
			}
			stats.questionCount = stats.questionCount + 1;
			SurveySchema.Attribute attribute = item.schema.getAttribute();
			if (attribute == null) {
				continue;
			}
			boolean manual = SurveySchema.ExamScoreMode.manual.equals(attribute.getExamAnswerMode());
			if (manual && !graded) {
				stats.manualPending = true;
			}
			Double max = attribute.getExamScore();
			if (max == null || max.doubleValue() <= 0d) {
				continue;
			}
			stats.scoredCount = stats.scoredCount + 1;
			maxTotal = maxTotal + max.doubleValue();
			hasMax = true;
			Double earned = earnedScore(answer, item.schema.getId());
			double value = earned == null ? 0d : earned.doubleValue();
			if (value >= max.doubleValue() - EPS) {
				stats.correctCount = stats.correctCount + 1;
			}
		}
		stats.maxScore = hasMax ? Double.valueOf(maxTotal) : null;
		return stats;
	}

	private static Double earnedScore(AnswerView answer, String questionId) {
		AnswerExamInfo examInfo = answer.getExamInfo();
		if (examInfo == null || examInfo.getQuestionScore() == null || questionId == null) {
			return null;
		}
		return examInfo.getQuestionScore().get(questionId);
	}

	/* ======================= 抬头 / 信息卡 ======================= */

	static String displayTitle(ProjectView project, AnswerView answer) {
		SurveySchema survey = project.getSurvey();
		if (survey != null && survey.getAttribute() != null && hasText(survey.getAttribute().getHeaderTitle())) {
			return SchemaHelper.trimHtmlTag(survey.getAttribute().getHeaderTitle());
		}
		if (survey != null && hasText(survey.getTitle())) {
			return SchemaHelper.trimHtmlTag(survey.getTitle());
		}
		return project.getName() == null ? "答卷" : project.getName();
	}

	private static void drawHeader(Layout layout, ProjectView project, AnswerView answer, PdfOptions opts)
			throws IOException {

		layout.ensure(190f);
		layout.advance(6f);
		String title = displayTitle(project, answer);
		List<String> titleLines = layout.wrap(title, TITLE_SIZE, layout.contentWidth());

		String attemptTag = attemptTag(opts);
		float tagWidth = hasText(attemptTag) ? layout.textWidth(attemptTag, SUBTITLE_SIZE) + 4f : 0f;
		for (int i = 0; i < titleLines.size(); i++) {
			String line = titleLines.get(i);
			layout.drawText(line, MARGIN_LEFT, TITLE_SIZE, true, COLOR_TEXT);
			if (i == 0 && hasText(attemptTag)) {
				layout.drawText(attemptTag, layout.rightEdge() - tagWidth, SUBTITLE_SIZE, false, COLOR_SOFT);
			}
			layout.advance(TITLE_SIZE * 1.32f);
		}

		String subtitle = subtitle(project, opts);
		if (hasText(subtitle)) {
			layout.advance(2f);
			for (String line : layout.wrap(subtitle, SUBTITLE_SIZE, layout.contentWidth())) {
				layout.drawText(line, MARGIN_LEFT, SUBTITLE_SIZE, false, COLOR_SOFT);
				layout.advance(SUBTITLE_SIZE * 1.5f);
			}
		}
		layout.advance(8f);
	}

	private static String attemptTag(PdfOptions opts) {
		Integer attemptNo = opts.getAttemptNo();
		if (attemptNo == null) {
			return null;
		}
		int ordinal = attemptNo.intValue() + 1;
		if (ordinal < 1) {
			ordinal = 1;
		}
		return "第 " + ordinal + " 次作答";
	}

	private static String subtitle(ProjectView project, PdfOptions opts) {
		List<String> parts = new ArrayList<>();
		if (hasText(opts.getClassLabel())) {
			parts.add("班级：" + SchemaHelper.trimHtmlTag(opts.getClassLabel()));
		}
		if (hasText(project.getCategory())) {
			parts.add("分类：" + SchemaHelper.trimHtmlTag(project.getCategory()));
		}
		return String.join("    ", parts);
	}

	private static void drawInfoCard(Layout layout, AnswerView answer, PdfOptions opts, AnswerStats stats)
			throws IOException {
		float cardHeight = 64f;
		float width = layout.contentWidth();
		float top = layout.y();
		layout.fillRect(MARGIN_LEFT, top - cardHeight, width, cardHeight, COLOR_CARD);

		String name = answererName(answer);
		layout.drawTextAt("答题人", MARGIN_LEFT + 14f, top - 18f, META_SIZE, false, COLOR_SOFT);
		layout.drawTextAt(name, MARGIN_LEFT + 14f, top - 40f, 13f, true, COLOR_TEXT);

		String score = scoreText(answer, stats);
		float scoreWidth = layout.textWidth(score, SCORE_BIG_SIZE);
		layout.drawTextAt("总分", layout.rightEdge() - 14f - layout.textWidth("总分", META_SIZE), top - 18f, META_SIZE,
				false, COLOR_SOFT);
		layout.drawTextAt(score, layout.rightEdge() - 14f - scoreWidth, top - 46f, SCORE_BIG_SIZE, true, COLOR_TEXT);
		layout.advance(cardHeight + 10f);

		List<String> parts = new ArrayList<>();
		if (stats.scoredCount > 0) {
			parts.add("答对 " + stats.correctCount + " / 共 " + stats.scoredCount + " 题");
		}
		else if (stats.questionCount > 0) {
			parts.add("共 " + stats.questionCount + " 题");
		}
		String duration = durationText(answer.getMetaInfo());
		if (hasText(duration)) {
			parts.add("用时 " + duration);
		}
		String submitTime = dateText(answer.getCreateAt());
		if (hasText(submitTime)) {
			parts.add("交卷时间 " + submitTime);
		}
		String metaLine = String.join("        ", parts);
		if (hasText(metaLine)) {
			for (String line : layout.wrap(metaLine, META_SIZE, layout.contentWidth())) {
				layout.drawText(line, MARGIN_LEFT, META_SIZE, false, COLOR_SOFT);
				layout.advance(META_SIZE * 1.6f);
			}
		}
		if (stats.manualPending) {
			layout.drawText("卷内含人工批改题，最终得分待老师批改后确定", MARGIN_LEFT, META_SIZE, false, COLOR_PARTIAL);
			layout.advance(META_SIZE * 1.6f);
		}
		layout.advance(6f);
	}

	static String answererName(AnswerView answer) {
		if (hasText(answer.getAnswererName())) {
			return SchemaHelper.trimHtmlTag(answer.getAnswererName());
		}
		if (Boolean.TRUE.equals(answer.getIsAnonymous())) {
			return "匿名";
		}
		if (hasText(answer.getCreateByName())) {
			return SchemaHelper.trimHtmlTag(answer.getCreateByName());
		}
		if (hasText(answer.getCreateBy())) {
			return "账号 " + answer.getCreateBy();
		}
		return "未填写";
	}

	private static String scoreText(AnswerView answer, AnswerStats stats) {
		Double total = answer.getExamScore();
		if (total == null) {
			return "—";
		}
		String text = formatScore(total);
		if (stats.maxScore != null && stats.maxScore.doubleValue() > 0d) {
			return text + " / " + formatScore(stats.maxScore);
		}
		return text;
	}

	private static void drawSectionTitle(Layout layout, String title) throws IOException {
		layout.ensure(48f);
		layout.advance(4f);
		layout.drawText(title, MARGIN_LEFT, SECTION_SIZE, true, COLOR_TEXT);
		layout.advance(SECTION_SIZE * 1.1f);
		float top = layout.y() + 6f;
		layout.horizontalLine(top, COLOR_LINE, 0.8f);
		layout.advance(8f);
	}

	/* ======================= 逐题渲染 ======================= */

	private static void drawQuestion(Layout layout, QuestionItem item, AnswerView answer, PdfOptions opts)
			throws IOException {
		if (item.schema == null) {

			List<String> lines = layout.wrap(item.heading, QUESTION_SIZE, layout.contentWidth());
			layout.ensure(QUESTION_SIZE * 1.6f * lines.size() + 16f);
			layout.advance(10f);
			for (String line : lines) {
				layout.drawText(line, MARGIN_LEFT, QUESTION_SIZE, true, COLOR_TEXT);
				layout.advance(QUESTION_SIZE * 1.6f);
			}
			layout.advance(6f);
			return;
		}
		SurveySchema schema = item.schema;
		LinkedHashMap<String, Object> answerMap = answer.getAnswer();
		Object value = answerMap == null ? null : answerMap.get(schema.getId());

		List<QLine> lines = new ArrayList<>();

		String title = SchemaHelper.trimHtmlTag(schema.getTitle()).replace('\u00a0', ' ');
		StringBuilder head = new StringBuilder();
		head.append(item.number).append(". ").append(hasText(title) ? title : "（无题干）");
		Double max = maxScore(schema);
		if (max != null && max.doubleValue() > 0d) {
			head.append("（").append(formatScore(max)).append(" 分）");
		}
		addWrapped(lines, layout, head.toString(), 0f, 20f, QUESTION_SIZE, true, COLOR_TEXT);


		if (hasOptions(schema.getType())) {
			appendOptionLines(lines, layout, schema, value);
		}
		else {
			appendAnswerLines(lines, layout, schema, value);
		}


		QLine result = buildResultLine(layout, schema, answer);
		if (result != null) {
			lines.add(result);
		}

		if (opts.isIncludeAnalysis()) {
			appendAnalysisLines(lines, layout, schema);
		}


		List<Img> images = opts.isIncludeImages() ? loadImages(layout, schema, value, opts) : Collections.emptyList();


		float height = 16f;
		for (QLine line : lines) {
			height = height + line.height();
		}
		for (Img image : images) {
			height = height + image.height + 8f;
		}
		height = height + 12f;
		layout.ensure(height);
		layout.advance(12f);
		for (QLine line : lines) {
			layout.drawText(line.text, MARGIN_LEFT + line.indent, line.size, line.bold, line.color);
			layout.advance(line.height());
		}
		for (Img image : images) {
			layout.drawImage(image);
		}
		layout.advance(8f);
	}

	private static boolean hasOptions(QuestionType type) {
		return type == QuestionType.Radio || type == QuestionType.Checkbox || type == QuestionType.Judge;
	}

	private static void appendOptionLines(List<QLine> lines, Layout layout, SurveySchema schema, Object value)
			throws IOException {
		List<SurveySchema> options = schema.getChildren();
		if (options == null || options.isEmpty()) {
			return;
		}
		Map<?, ?> selected = value instanceof Map ? (Map<?, ?>) value : Collections.emptyMap();
		int index = 0;
		for (SurveySchema option : options) {
			if (option == null) {
				continue;
			}
			index = index + 1;
			boolean mine = selected != null && selected.containsKey(option.getId());
			boolean correct = option.getAttribute() != null && hasText(option.getAttribute().getExamCorrectAnswer());
			StringBuilder text = new StringBuilder();
			text.append(optionLetter(index)).append(". ").append(SchemaHelper.trimHtmlTag(option.getTitle()));
			String tag = optionTag(correct, mine);
			if (hasText(tag)) {
				text.append("  ").append(tag);
			}
			Color color = correct ? COLOR_CORRECT : (mine ? COLOR_MINE : COLOR_TEXT);
			addWrapped(lines, layout, text.toString(), 18f, 32f, ANSWER_SIZE, false, color);
		}
	}

	private static String optionLetter(int index) {
		if (index >= 1 && index <= 26) {
			return String.valueOf((char) ('A' + index - 1));
		}
		return String.valueOf(index);
	}

	private static String optionTag(boolean correct, boolean mine) {
		if (correct && mine) {
			return "（正确答案 · 我的选择）";
		}
		if (correct) {
			return "（正确答案）";
		}
		if (mine) {
			return "（我的选择）";
		}
		return null;
	}

	/**
	 * 主观题/填空题：把「我的作答」摊平成可读文本。选项类题不在这里处理。
	 */
	private static void appendAnswerLines(List<QLine> lines, Layout layout, SurveySchema schema, Object value)
			throws IOException {
		List<String> parts = flattenAnswer(schema, value);
		if (parts.isEmpty()) {
			addWrapped(lines, layout, "我的作答：（未作答）", 18f, 32f, ANSWER_SIZE, false, COLOR_SOFT);
			return;
		}
		for (int i = 0; i < parts.size(); i++) {
			String prefix = i == 0 ? "我的作答：" : "";
			addWrapped(lines, layout, prefix + parts.get(i), 18f, 32f, ANSWER_SIZE, false, COLOR_TEXT);
		}
	}

	/**
	 * 摊平答案 JSON。不同题型的结构不一样：
	 * 选项题是 {qid:{optionId:true}}，填空题是 {qid:{blankId:"文本"}}，
	 * 矩阵是 {qid:{rowId:{cellId:值}}}，评分题直接是数字。
	 */
	private static List<String> flattenAnswer(SurveySchema schema, Object value) {
		List<String> parts = new ArrayList<>();
		if (value == null) {
			return parts;
		}
		QuestionType type = schema.getType();
		if (type == QuestionType.Upload || type == QuestionType.Signature) {

			List<String> fileIds = new ArrayList<>();
			collectFileIds(value, fileIds);
			if (!fileIds.isEmpty()) {
				parts.add(type == QuestionType.Signature ? "已签名" : "已上传 " + fileIds.size() + " 个附件");
			}
			return parts;
		}
		if (value instanceof Map) {
			Map<?, ?> map = (Map<?, ?>) value;
			for (Map.Entry<?, ?> entry : map.entrySet()) {
				String key = String.valueOf(entry.getKey());
				Object cell = entry.getValue();
				String label = labelOf(schema, key);
				if (cell instanceof Map) {

					List<String> cells = new ArrayList<>();
					for (Map.Entry<?, ?> sub : ((Map<?, ?>) cell).entrySet()) {
						String text = cellText(schema, String.valueOf(sub.getKey()), sub.getValue());
						if (hasText(text)) {
							cells.add(text);
						}
					}
					if (!cells.isEmpty()) {
						parts.add((hasText(label) ? label + "：" : "") + String.join("、", cells));
					}
				}
				else if (cell instanceof Boolean) {
					if (Boolean.TRUE.equals(cell)) {
						parts.add(hasText(label) ? label : key);
					}
				}
				else if (cell instanceof Collection) {
					List<String> items = new ArrayList<>();
					for (Object one : (Collection<?>) cell) {
						if (one != null && hasText(String.valueOf(one))) {
							items.add(String.valueOf(one));
						}
					}
					if (!items.isEmpty()) {
						parts.add(String.join("、", items));
					}
				}
				else if (cell != null && hasText(String.valueOf(cell))) {
					parts.add(String.valueOf(cell));
				}
			}
			return parts;
		}
		if (value instanceof Collection) {
			for (Object one : (Collection<?>) value) {
				if (one instanceof Map) {
					List<String> cells = new ArrayList<>();
					for (Map.Entry<?, ?> sub : ((Map<?, ?>) one).entrySet()) {
						String text = cellText(schema, String.valueOf(sub.getKey()), sub.getValue());
						if (hasText(text)) {
							cells.add(text);
						}
					}
					if (!cells.isEmpty()) {
						parts.add(String.join("、", cells));
					}
				}
				else if (one != null && hasText(String.valueOf(one))) {
					parts.add(String.valueOf(one));
				}
			}
			return parts;
		}
		String text = String.valueOf(value);
		if (hasText(text) && !"true".equals(text)) {
			parts.add(type == QuestionType.Score || type == QuestionType.Nps ? text + " 分" : text);
		}
		return parts;
	}

	/** 用 schema 把孩子节点 id 翻成标题（选项/填空位/矩阵行都走这里） */
	private static String labelOf(SurveySchema schema, String id) {
		List<SurveySchema> children = schema.getChildren();
		if (children != null) {
			for (SurveySchema child : children) {
				if (child != null && id.equals(child.getId())) {
					return SchemaHelper.trimHtmlTag(child.getTitle());
				}
			}
		}
		List<SurveySchema.Row> rows = schema.getRow();
		if (rows != null) {
			for (SurveySchema.Row row : rows) {
				if (row != null && id.equals(row.getId())) {
					return SchemaHelper.trimHtmlTag(row.getTitle());
				}
			}
		}
		return null;
	}

	/** 矩阵单元格：能翻成「行：值」就翻，翻不出来就原样 */
	private static String cellText(SurveySchema schema, String cellId, Object value) {
		if (value == null || Boolean.FALSE.equals(value)) {
			return null;
		}
		if (Boolean.TRUE.equals(value)) {
			String label = labelOf(schema, cellId);
			return hasText(label) ? label : null;
		}
		String text = String.valueOf(value);
		if (!hasText(text)) {
			return null;
		}
		String label = labelOf(schema, cellId);
		return hasText(label) ? label + "：" + text : text;
	}

	private static QLine buildResultLine(Layout layout, SurveySchema schema, AnswerView answer) throws IOException {
		SurveySchema.Attribute attribute = schema.getAttribute();
		if (attribute == null) {
			return null;
		}
		boolean manual = SurveySchema.ExamScoreMode.manual.equals(attribute.getExamAnswerMode());
		boolean graded = "graded".equals(answer.getGradeStatus());
		if (manual && !graded) {
			return new QLine("待老师批改", 18f, ANSWER_SIZE, true, COLOR_PARTIAL);
		}
		Double max = attribute.getExamScore();
		if (max == null || max.doubleValue() <= 0d) {
			return null;
		}
		Double earned = earnedScore(answer, schema.getId());
		double value = earned == null ? 0d : earned.doubleValue();
		if (value >= max.doubleValue() - EPS) {
			return new QLine("回答正确  +" + formatScore(Double.valueOf(value)) + " 分", 18f, ANSWER_SIZE, true,
					COLOR_CORRECT);
		}
		if (value > 0d) {
			return new QLine("部分正确  +" + formatScore(Double.valueOf(value)) + " / " + formatScore(max) + " 分", 18f,
					ANSWER_SIZE, true, COLOR_PARTIAL);
		}
		return new QLine("回答错误  +0 分", 18f, ANSWER_SIZE, true, COLOR_WRONG);
	}

	private static void appendAnalysisLines(List<QLine> lines, Layout layout, SurveySchema schema) throws IOException {
		SurveySchema.Attribute attribute = schema.getAttribute();
		if (attribute == null || !hasText(attribute.getExamAnalysis())) {
			return;
		}
		String analysis = SchemaHelper.trimHtmlTag(attribute.getExamAnalysis());
		if (!hasText(analysis)) {
			return;
		}

		String text = analysis.startsWith("解析") ? analysis : "解析：" + analysis;
		addWrapped(lines, layout, text, 18f, 32f, ANSWER_SIZE - 0.5f, false, COLOR_SOFT);
	}

	private static Double maxScore(SurveySchema schema) {
		return schema.getAttribute() == null ? null : schema.getAttribute().getExamScore();
	}



	/**
	 * 答题卷还原版式：一行紧凑抬头 + 按卷面顺序逐题还原「题目 + 作答」。
	 * <p>
	 * 为什么不给成绩单多套几个 if：成绩单是「阅卷结果」（分数卡、对错色、每题得分），
	 * 答题卷是「卷面还原」（原样呈现学员看到并写下的一切）。两者排版语义不同，塞进一套代码里
	 * 迟早把某一方改坏，而成绩单是线上基线——一个字节都不能动。
	 */
	private static void drawAnswerSheet(Layout layout, AnswerView answer, PdfOptions options,
			List<QuestionItem> questions) throws IOException {
		AnswerStats stats = buildStats(questions, answer);
		drawSheetHeader(layout, answer, options, stats);
		for (QuestionItem item : questions) {
			drawSheetQuestion(layout, item, answer, options);
		}
	}

	/**
	 * 答题卷抬头：只留一行「姓名 / 班级 / 交卷时间 / 作答轮次 / 得分」。
	 * <p>
	 * 成绩单那套标题 + 分数卡 + 统计卡在这里全部不要：长图是老师在手机上看答卷用的，
	 * 半屏抬头换不来信息量，还费纸。
	 */
	private static void drawSheetHeader(Layout layout, AnswerView answer, PdfOptions options, AnswerStats stats)
			throws IOException {
		List<String> parts = new ArrayList<>();
		parts.add("姓名：" + answererName(answer));
		if (hasText(options.getClassLabel())) {
			parts.add("班级：" + SchemaHelper.trimHtmlTag(options.getClassLabel()));
		}
		String submitTime = dateText(answer.getCreateAt());
		if (hasText(submitTime)) {
			parts.add("交卷时间 " + submitTime);
		}
		String attempt = attemptTag(options);
		if (hasText(attempt)) {
			parts.add(attempt);
		}
		parts.add("得分 " + scoreText(answer, stats));
		layout.ensure(SECTION_SIZE * 2.6f);
		layout.advance(2f);
		for (String text : layout.wrap(String.join("    ", parts), SUBTITLE_SIZE, layout.contentWidth())) {
			layout.drawText(text, MARGIN_LEFT, SUBTITLE_SIZE, true, COLOR_TEXT);
			layout.advance(SUBTITLE_SIZE * 1.5f);
		}
		layout.horizontalLine(layout.y() + 4f, COLOR_LINE, 0.8f);
		layout.advance(10f);
		if (stats.manualPending) {

			layout.drawText("卷内含人工批改题，最终得分待老师批改后确定", MARGIN_LEFT, META_SIZE, false, COLOR_PARTIAL);
			layout.advance(META_SIZE * 1.6f);
		}
	}

	/** 一道题：题号 + 题干 → 选项方框 / 作答底块 → 可选解析 → 签名与上传图片（永远带） */
	private static void drawSheetQuestion(Layout layout, QuestionItem item, AnswerView answer, PdfOptions options)
			throws IOException {
		List<SheetLine> lines = new ArrayList<>();
		if (item.schema == null) {

			lines.add(SheetLine.spacer(SHEET_QUESTION_GAP, false));
			addSheetLines(lines, layout, item.heading, 0f, 0f, QUESTION_SIZE, true, COLOR_TEXT);
			lines.add(SheetLine.spacer(SHEET_QUESTION_GAP, false));
			drawSheetLines(layout, lines);
			return;
		}
		SurveySchema schema = item.schema;
		LinkedHashMap<String, Object> answerMap = answer.getAnswer();
		Object value = answerMap == null ? null : answerMap.get(schema.getId());


		String title = SchemaHelper.trimHtmlTag(schema.getTitle()).replace('\u00a0', ' ');
		String head = item.number + ". " + (hasText(title) ? title : "（无题干）");
		addSheetLines(lines, layout, head, SHEET_BODY_INDENT, SHEET_BODY_INDENT + SHEET_OPTION_HANG, QUESTION_SIZE,
				true, COLOR_TEXT);
		if (hasOptions(schema.getType())) {
			appendSheetOptions(lines, layout, schema, value);
		}
		else {
			appendSheetAnswerBlock(lines, layout, schema, value);
		}
		if (options.isIncludeAnalysis()) {
			appendSheetAnalysis(lines, layout, schema);
		}
		lines.add(SheetLine.spacer(SHEET_QUESTION_GAP, false));
		drawSheetLines(layout, lines);
		drawSheetImages(layout, schema, value, options);
	}

	/**
	 * 选项竖排：学员选中的选项前画实心方框，其余画空心方框（判断题同）。
	 * <p>
	 * 方框是矢量矩形，不是「□ / ■」字符：字体子集（见 fonts/README.md）不含 U+25A0 / U+25A1，
	 * 塞进 showText 会被 sanitize 换成「·」，卷面就毁了。
	 */
	private static void appendSheetOptions(List<SheetLine> lines, Layout layout, SurveySchema schema, Object value)
			throws IOException {
		List<SurveySchema> options = schema.getChildren();
		if (options == null || options.isEmpty()) {
			return;
		}
		Map<?, ?> selected = value instanceof Map ? (Map<?, ?>) value : Collections.emptyMap();
		float indent = SHEET_BODY_INDENT + SHEET_OPTION_HANG;
		float boxWidth = ANSWER_SIZE * SHEET_BOX_RATIO + ANSWER_SIZE * 0.45f;
		int index = 0;
		for (SurveySchema option : options) {
			if (option == null) {
				continue;
			}
			index = index + 1;
			boolean mine = selected != null && selected.containsKey(option.getId());
			String text = optionLetter(index) + ". " + SchemaHelper.trimHtmlTag(option.getTitle());
			List<String> wrapped = layout.wrap(text, ANSWER_SIZE, layout.contentWidth() - indent - boxWidth);
			for (int i = 0; i < wrapped.size(); i++) {

				lines.add(SheetLine.option(wrapped.get(i), i == 0 ? indent : indent + boxWidth, ANSWER_SIZE,
						i == 0 ? Boolean.valueOf(mine) : null));
			}
		}
	}

	/**
	 * 填空/简答/矩阵等：题干下方用一块浅底显示学员原文，保留换行；没作答就写「（未作答）」。
	 * <p>
	 * 签名/上传题也走这里：先用一句「已签名 / 已上传 N 个附件」占位，图片在正文之后统一贴。
	 */
	private static void appendSheetAnswerBlock(List<SheetLine> lines, Layout layout, SurveySchema schema,
			Object value) throws IOException {
		List<String> parts = flattenAnswer(schema, value);
		lines.add(SheetLine.spacer(SHEET_BLOCK_GAP, true));
		float textWidth = layout.contentWidth() - SHEET_BLOCK_PADDING * 2f;
		if (parts.isEmpty()) {
			lines.add(SheetLine.block("（未作答）", SHEET_BLOCK_PADDING, ANSWER_SIZE, COLOR_SOFT));
		}
		else {
			for (String part : parts) {
				for (String one : layout.wrap(part, ANSWER_SIZE, textWidth)) {
					lines.add(SheetLine.block(one, SHEET_BLOCK_PADDING, ANSWER_SIZE, COLOR_TEXT));
				}
			}
		}
		lines.add(SheetLine.spacer(SHEET_BLOCK_GAP, true));
	}

	/** 解析（可选）：和成绩单一样用浅色小字附在题后 */
	private static void appendSheetAnalysis(List<SheetLine> lines, Layout layout, SurveySchema schema)
			throws IOException {
		SurveySchema.Attribute attribute = schema.getAttribute();
		if (attribute == null || !hasText(attribute.getExamAnalysis())) {
			return;
		}
		String analysis = SchemaHelper.trimHtmlTag(attribute.getExamAnalysis());
		if (!hasText(analysis)) {
			return;
		}

		String text = analysis.startsWith("解析") ? analysis : "解析：" + analysis;
		float size = ANSWER_SIZE - 0.5f;
		float indent = SHEET_BODY_INDENT + SHEET_OPTION_HANG;
		for (String one : layout.wrap(text, size, layout.contentWidth() - indent)) {
			lines.add(SheetLine.text(one, indent, size, false, COLOR_SOFT));
		}
	}

	/**
	 * 签名/上传题的图片：答题卷版式里永远嵌入，不再看 includeImages。
	 * <p>
	 * 「附签名/上传图片」这个选项取消掉了：老师要确认的是学员到底交了什么，
	 * 勾漏一次这张卷子就变成「没作答」，责任说不清。
	 */
	private static void drawSheetImages(Layout layout, SurveySchema schema, Object value, PdfOptions options)
			throws IOException {
		for (Img image : loadImages(layout, schema, value, options)) {

			layout.ensure(image.height + 8f);
			layout.drawImage(image);
		}
	}

	/** 普通文本行：{@link #addWrapped} 的答题卷版本，只是产出 {@link SheetLine} */
	private static void addSheetLines(List<SheetLine> out, Layout layout, String text, float firstIndent,
			float restIndent, float size, boolean bold, Color color) throws IOException {
		float maxWidth = layout.contentWidth() - Math.max(firstIndent, restIndent);
		List<String> wrapped = layout.wrap(text, size, maxWidth);
		for (int i = 0; i < wrapped.size(); i++) {
			out.add(SheetLine.text(wrapped.get(i), i == 0 ? firstIndent : restIndent, size, bold, color));
		}
	}

	/**
	 * 画一批答题卷行。
	 * <p>
	 * 默认整批不跨页（题目不能被截成两半）；但单题高过一页时（超长简答）必须退化成逐行流动——

	 */
	private static void drawSheetLines(Layout layout, List<SheetLine> lines) throws IOException {
		float total = 0f;
		for (SheetLine line : lines) {
			total = total + line.height;
		}
		if (total <= layout.bodyHeight()) {
			layout.ensure(total);
			drawSheetChunk(layout, lines);
			return;
		}
		int index = 0;
		while (index < lines.size()) {
			if (layout.remaining() < lines.get(index).height) {
				layout.newPage();
			}
			List<SheetLine> chunk = new ArrayList<>();
			float used = 0f;
			while (index < lines.size()) {
				SheetLine line = lines.get(index);
				if (!chunk.isEmpty() && used + line.height > layout.remaining()) {
					break;
				}
				chunk.add(line);
				used = used + line.height;
				index = index + 1;
			}
			drawSheetChunk(layout, chunk);
		}
	}

	/** 一批行（保证当前页放得下）：先铺作答底块，再写字——顺序反了底块会把字盖住 */
	private static void drawSheetChunk(Layout layout, List<SheetLine> chunk) throws IOException {
		float chunkTop = layout.y();
		float cursor = chunkTop;
		int index = 0;
		while (index < chunk.size()) {
			if (!chunk.get(index).inBlock) {
				cursor = cursor - chunk.get(index).height;
				index = index + 1;
				continue;
			}
			float top = cursor;
			while (index < chunk.size() && chunk.get(index).inBlock) {
				cursor = cursor - chunk.get(index).height;
				index = index + 1;
			}
			layout.fillRect(MARGIN_LEFT, cursor, layout.contentWidth(), top - cursor, COLOR_CARD);
		}
		cursor = chunkTop;
		for (SheetLine line : chunk) {
			drawSheetLine(layout, line, cursor);
			cursor = cursor - line.height;
		}
		layout.advance(chunkTop - cursor);
	}

	/** 一行：方框（可选）+ 文字；基线偏移与 {@link Layout#drawText} 保持一致 */
	private static void drawSheetLine(Layout layout, SheetLine line, float top) throws IOException {
		if (line.text == null) {
			return;
		}
		float baseline = top - line.size * 0.86f;
		float x = MARGIN_LEFT + line.indent;
		if (line.selected != null) {
			float box = line.size * SHEET_BOX_RATIO;
			float bottom = baseline - line.size * 0.12f;
			if (line.selected.booleanValue()) {
				layout.fillRect(x, bottom, box, box, COLOR_TEXT);
			}
			else {
				layout.strokeRect(x, bottom, box, box, COLOR_TEXT, 0.7f);
			}
			x = x + box + line.size * 0.45f;
		}
		layout.drawTextAt(line.text, x, baseline, line.size, line.bold, line.color);
	}







	private static final class SheetLine {


		private final String text;

		private final float indent;

		private final float size;

		private final boolean bold;

		private final Color color;


		private final Boolean selected;


		private final boolean inBlock;

		private final float height;

		private SheetLine(String text, float indent, float size, boolean bold, Color color, Boolean selected,
				boolean inBlock, float height) {
			this.text = text;
			this.indent = indent;
			this.size = size;
			this.bold = bold;
			this.color = color;
			this.selected = selected;
			this.inBlock = inBlock;
			this.height = height;
		}

		private static SheetLine text(String text, float indent, float size, boolean bold, Color color) {
			return new SheetLine(text, indent, size, bold, color, null, false, size * SHEET_LINE_RATIO);
		}

		private static SheetLine block(String text, float indent, float size, Color color) {
			return new SheetLine(text, indent, size, false, color, null, true, size * SHEET_LINE_RATIO);
		}

		private static SheetLine option(String text, float indent, float size, Boolean selected) {
			return new SheetLine(text, indent, size, false, COLOR_TEXT, selected, false, size * SHEET_LINE_RATIO);
		}

		/** 只占位的空行：作答底块的上下留白靠它撑出来，底块会把留白一起铺上底色 */
		private static SheetLine spacer(float height, boolean inBlock) {
			return new SheetLine(null, 0f, 0f, false, COLOR_TEXT, null, inBlock, height);
		}

	}



	private static final class Img {

		private final byte[] data;

		private final float width;

		private final float height;

		private Img(byte[] data, float width, float height) {
			this.data = data;
			this.width = width;
			this.height = height;
		}

	}

	/**
	 * 加载签名题/上传题的图片：先把像素宽缩到 {@link #IMAGE_MAX_PIXEL_WIDTH} 再嵌入，
	 * 免得一张 4000px 的手机照片把 PDF 撑成几十 MB。
	 */
	private static List<Img> loadImages(Layout layout, SurveySchema schema, Object value, PdfOptions opts) {
		QuestionType type = schema.getType();
		if (type != QuestionType.Upload && type != QuestionType.Signature) {
			return Collections.emptyList();
		}
		Function<String, byte[]> loader = opts.getImageLoader();
		if (loader == null) {
			return Collections.emptyList();
		}
		List<String> fileIds = new ArrayList<>();
		collectFileIds(value, fileIds);
		if (fileIds.isEmpty()) {
			return Collections.emptyList();
		}
		List<Img> images = new ArrayList<>();
		for (String fileId : fileIds) {
			try {
				byte[] raw = loader.apply(fileId);
				byte[] scaled = scaleImage(raw, IMAGE_MAX_PIXEL_WIDTH);
				if (scaled == null) {
					continue;
				}
				int[] size = imageSize(scaled);
				if (size == null || size[0] <= 0 || size[1] <= 0) {
					continue;
				}
				float width = size[0];
				float height = size[1];
				float scale = Math.min(1f, Math.min(IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height));
				images.add(new Img(scaled, width * scale, height * scale));
			}
			catch (Exception e) {

				log.warn("答卷 PDF 嵌入图片失败: fileId={}, {}", fileId, e.getMessage());
			}
		}
		return images;
	}

	private static void collectFileIds(Object value, List<String> out) {
		if (value == null) {
			return;
		}
		if (value instanceof String) {
			String id = (String) value;
			if (hasText(id)) {
				out.add(id);
			}
			return;
		}
		if (value instanceof Collection) {
			for (Object one : (Collection<?>) value) {
				collectFileIds(one, out);
			}
			return;
		}
		if (value instanceof Map) {
			for (Object one : ((Map<?, ?>) value).values()) {
				collectFileIds(one, out);
			}
		}
	}


	private static byte[] scaleImage(byte[] raw, int maxPixelWidth) {
		if (raw == null || raw.length == 0) {
			return null;
		}
		try (ByteArrayInputStream in = new ByteArrayInputStream(raw)) {
			BufferedImage image = ImageIO.read(in);
			if (image == null) {
				return raw;
			}
			if (image.getWidth() <= maxPixelWidth) {
				return raw;
			}
			float ratio = maxPixelWidth / (float) image.getWidth();
			int width = maxPixelWidth;
			int height = Math.max(1, Math.round(image.getHeight() * ratio));
			BufferedImage scaled = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
			Graphics2D graphics = scaled.createGraphics();
			try {

				graphics.setColor(Color.WHITE);
				graphics.fillRect(0, 0, width, height);
				graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
						RenderingHints.VALUE_INTERPOLATION_BILINEAR);
				graphics.drawImage(image, 0, 0, width, height, null);
			}
			finally {
				graphics.dispose();
			}
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			if (!ImageIO.write(scaled, "png", out)) {
				return raw;
			}
			return out.toByteArray();
		}
		catch (Exception e) {
			log.warn("答卷 PDF 缩放图片失败: {}", e.getMessage());
			return raw;
		}
	}

	private static int[] imageSize(byte[] data) {
		try (ByteArrayInputStream in = new ByteArrayInputStream(data)) {
			BufferedImage image = ImageIO.read(in);
			if (image == null) {
				return null;
			}

			return new int[] { Math.round(image.getWidth() * 0.75f), Math.round(image.getHeight() * 0.75f) };
		}
		catch (IOException e) {
			return null;
		}
	}



	private static final class QLine {

		private final String text;

		private final float indent;

		private final float size;

		private final boolean bold;

		private final Color color;

		private QLine(String text, float indent, float size, boolean bold, Color color) {
			this.text = text;
			this.indent = indent;
			this.size = size;
			this.bold = bold;
			this.color = color;
		}

		private float height() {
			return size * 1.55f;
		}

	}

	private static void addWrapped(List<QLine> out, Layout layout, String text, float firstIndent, float restIndent,
			float size, boolean bold, Color color) throws IOException {
		float maxWidth = layout.contentWidth() - Math.max(firstIndent, restIndent);
		List<String> wrapped = layout.wrap(text, size, maxWidth);
		for (int i = 0; i < wrapped.size(); i++) {
			out.add(new QLine(wrapped.get(i), i == 0 ? firstIndent : restIndent, size, bold, color));
		}
	}







	private static final class Layout implements Closeable {

		private final PDDocument doc;

		private final PDType0Font font;


		private final boolean showFooter;

		private PDPage page;

		private PDPageContentStream stream;

		private float cursorY;

		private int pageNumber;

		private Layout(PDDocument doc, PDType0Font font, boolean showFooter) throws IOException {
			this.doc = doc;
			this.font = font;
			this.showFooter = showFooter;
			newPage();
		}

		private float contentWidth() {
			return PDRectangle.A4.getWidth() - MARGIN_LEFT - MARGIN_RIGHT;
		}

		private float rightEdge() {
			return MARGIN_LEFT + contentWidth();
		}

		private float y() {
			return cursorY;
		}

		private void advance(float delta) {
			cursorY = cursorY - delta;
		}

		private void newPage() throws IOException {
			if (stream != null) {
				drawFooter();
				stream.close();
				stream = null;
			}
			page = new PDPage(PDRectangle.A4);
			doc.addPage(page);
			stream = new PDPageContentStream(doc, page);
			pageNumber = pageNumber + 1;
			cursorY = page.getMediaBox().getHeight() - MARGIN_TOP;
		}

		/** 剩余可用高度不够就换页 */
		private void ensure(float height) throws IOException {
			if (cursorY - height < MARGIN_BOTTOM) {
				newPage();
			}
		}

		/** 当前页还能用掉多少高度（算到页脚留白为止） */
		private float remaining() {
			return cursorY - MARGIN_BOTTOM;
		}

		/** 一页正文可用高度：判断「这道题放不放得下」用 */
		private float bodyHeight() {
			return page.getMediaBox().getHeight() - MARGIN_TOP - MARGIN_BOTTOM;
		}

		private void drawFooter() throws IOException {
			if (!showFooter) {
				return;
			}
			String text = "第 " + pageNumber + " 页";
			float size = 8f;
			float width = textWidth(text, size);
			stream.beginText();
			stream.setFont(font, size);
			stream.setNonStrokingColor(COLOR_SOFT);
			stream.setRenderingMode(RenderingMode.FILL);
			stream.newLineAtOffset(MARGIN_LEFT + (contentWidth() - width) / 2f, FOOTER_BASELINE);
			stream.showText(sanitize(text));
			stream.endText();
		}

		private void finish() throws IOException {
			if (stream != null) {
				drawFooter();
				stream.close();
				stream = null;
			}
		}

		@Override
		public void close() {
			if (stream != null) {
				try {
					stream.close();
				}
				catch (IOException e) {
					log.warn("关闭 PDF 内容流失:{}", e.getMessage());
				}
				stream = null;
			}
		}

		/** 单行文本宽度（pt） */
		private float textWidth(String text, float size) {
			if (text == null || text.isEmpty()) {
				return 0f;
			}
			float units = 0f;
			for (int i = 0; i < text.length();) {
				int codePoint = text.codePointAt(i);
				i = i + Character.charCount(codePoint);
				units = units + charUnits(codePoint);
			}
			return units * size / 1000f;
		}

		/** 单个码位的字宽（千分之一 em），带缓存：断行是 O(n) 次查询，不能每次都进 PDFBox */
		private float charUnits(int codePoint) {
			Float cached = WIDTH_CACHE.get(Integer.valueOf(codePoint));
			if (cached != null) {
				return cached.floatValue();
			}
			float units;
			try {
				units = font.getStringWidth(new String(Character.toChars(codePoint)));
			}
			catch (Exception e) {
				units = 500f;
			}
			WIDTH_CACHE.put(Integer.valueOf(codePoint), Float.valueOf(units));
			return units;
		}

		/** 按宽度断行：中文按字断，英文尽量在空格处断 */
		private List<String> wrap(String text, float size, float maxWidth) {
			List<String> lines = new ArrayList<>();
			String normalized = sanitize(text);
			if (normalized.isEmpty()) {
				lines.add("");
				return lines;
			}
			String[] paragraphs = normalized.split("\n", -1);
			for (String paragraph : paragraphs) {
				wrapParagraph(paragraph, size, maxWidth, lines);
			}
			if (lines.isEmpty()) {
				lines.add("");
			}
			return lines;
		}

		private void wrapParagraph(String paragraph, float size, float maxWidth, List<String> lines) {
			if (paragraph == null || paragraph.isEmpty()) {
				lines.add("");
				return;
			}
			StringBuilder current = new StringBuilder();
			float width = 0f;
			int lastSpace = -1;
			for (int i = 0; i < paragraph.length();) {
				int codePoint = paragraph.codePointAt(i);
				int charCount = Character.charCount(codePoint);
				String piece = paragraph.substring(i, i + charCount);
				i = i + charCount;
				if (current.length() == 0 && " ".equals(piece)) {
					continue;
				}
				float pieceWidth = charUnits(codePoint) * size / 1000f;
				if (width + pieceWidth > maxWidth && current.length() > 0) {
					if (lastSpace > 0) {
						String head = current.substring(0, lastSpace);
						String tail = current.substring(lastSpace + 1);
						lines.add(head);
						current.setLength(0);
						current.append(tail);
						width = textWidthInUnits(tail, size);
						lastSpace = -1;
					}
					else {
						lines.add(current.toString());
						current.setLength(0);
						width = 0f;
						lastSpace = -1;
					}
					if (" ".equals(piece)) {
						continue;
					}
				}
				if (" ".equals(piece)) {
					lastSpace = current.length();
				}
				current.append(piece);
				width = width + pieceWidth;
			}
			if (current.length() > 0) {
				lines.add(current.toString());
			}
		}

		private float textWidthInUnits(String text, float size) {
			return textWidth(text, size);
		}

		private void drawText(String text, float x, float size, boolean bold, Color color) throws IOException {
			if (text == null || text.isEmpty()) {
				return;
			}
			float baseline = cursorY - size * 0.86f;
			drawTextAt(text, x, baseline, size, bold, color);
		}

		/**
		 * 按基线绝对定位绘制。加粗用「填充 + 描边」模拟（字体只有一个字重），
		 * 描边宽度取字号的 2.5%，肉眼接近 semibold。
		 */
		private void drawTextAt(String text, float x, float baseline, float size, boolean bold, Color color)
				throws IOException {
			if (text == null || text.isEmpty()) {
				return;
			}
			stream.beginText();
			stream.setFont(font, size);
			stream.setNonStrokingColor(color);
			if (bold) {
				stream.setStrokingColor(color);
				stream.setLineWidth(size * 0.025f);
				stream.setRenderingMode(RenderingMode.FILL_STROKE);
			}
			else {
				stream.setRenderingMode(RenderingMode.FILL);
			}


			stream.newLineAtOffset(x, baseline);
			stream.showText(sanitize(text));
			stream.endText();
		}

		private void fillRect(float x, float y, float width, float height, Color color) throws IOException {
			stream.setNonStrokingColor(color);
			stream.addRect(x, y, width, height);
			stream.fill();
		}

		/** 只描边不填充的矩形：答题卷里表示「这个选项没选」 */
		private void strokeRect(float x, float y, float width, float height, Color color, float lineWidth)
				throws IOException {
			stream.setStrokingColor(color);
			stream.setLineWidth(lineWidth);
			stream.addRect(x, y, width, height);
			stream.stroke();
		}

		private void horizontalLine(float y, Color color, float lineWidth) throws IOException {
			stream.setStrokingColor(color);
			stream.setLineWidth(lineWidth);
			stream.moveTo(MARGIN_LEFT, y);
			stream.lineTo(rightEdge(), y);
			stream.stroke();
		}

		private void drawImage(Img image) throws IOException {
			float x = MARGIN_LEFT + 18f;
			float top = cursorY;
			PDImageXObject xobject = PDImageXObject.createFromByteArray(doc, image.data, "answer-image");
			stream.drawImage(xobject, x, top - image.height, image.width, image.height);
			advance(image.height + 8f);
		}

	}









	private static final int[][] SAFE_RANGES = { { 0x20, 0x7E }, { 0xA0, 0xFF }, { 0x2000, 0x206F }, { 0x3000, 0x303F },
			{ 0x4E00, 0x9FFF }, { 0xFF00, 0xFFEF } };

	/** 常见符号的手工映射：字体里没有这些字形，换成等价的中文/ASCII 表达。包内可见，便于单测。 */
	static String sanitize(String text) {
		if (text == null) {
			return "";
		}
		StringBuilder builder = new StringBuilder(text.length());
		for (int i = 0; i < text.length();) {
			int codePoint = text.codePointAt(i);
			i = i + Character.charCount(codePoint);
			if (codePoint == '\n' || codePoint == '\r') {
				builder.append('\n');
			}
			else if (codePoint == '\t') {
				builder.append("    ");
			}
			else if (isSafeCodePoint(codePoint)) {
				builder.appendCodePoint(codePoint);
			}
			else if (codePoint == 0x2713 || codePoint == 0x2714 || codePoint == 0x221A) {

				builder.append("正确");
			}
			else if (codePoint == 0x2715 || codePoint == 0x2716 || codePoint == 0x2717 || codePoint == 0x2718
					|| codePoint == 0x00D7) {
				builder.append("错误");
			}
			else if (codePoint == 0x2192 || codePoint == 0x21D2) {
				builder.append("->");
			}
			else if (codePoint == 0x2022 || codePoint == 0x25CF || codePoint == 0x25AA || codePoint == 0x25A0) {
				builder.append('·');
			}
			else {
				builder.append(' ');
			}
		}
		return builder.toString().replace('\r', '\n');
	}

	private static boolean isSafeCodePoint(int codePoint) {
		for (int[] range : SAFE_RANGES) {
			if (codePoint >= range[0] && codePoint <= range[1]) {
				return true;
			}
		}
		return false;
	}

	private static boolean hasText(String text) {
		return text != null && !text.trim().isEmpty();
	}

	static String formatScore(Double value) {
		if (value == null) {
			return "0";
		}
		double number = value.doubleValue();
		if (Math.abs(number - Math.rint(number)) < EPS) {
			return String.valueOf((long) Math.rint(number));
		}
		return String.format(java.util.Locale.ROOT, "%.1f", Double.valueOf(number));
	}

	/** 用时：优先用服务端写入的 answerInfo.startTime/endTime，缺失就返回 null（不猜） */
	private static String durationText(AnswerMetaInfo metaInfo) {
		if (metaInfo == null || metaInfo.getAnswerInfo() == null) {
			return null;
		}
		long start = metaInfo.getAnswerInfo().getStartTime();
		long end = metaInfo.getAnswerInfo().getEndTime();
		long millis = end - start;
		if (start <= 0L || end <= 0L || millis <= 0L) {
			return null;
		}
		long totalSeconds = millis / 1000L;
		long hours = totalSeconds / 3600L;
		long minutes = (totalSeconds % 3600L) / 60L;
		long seconds = totalSeconds % 60L;
		if (hours > 0L) {
			return hours + "小时" + minutes + "分" + seconds + "秒";
		}
		return minutes + "分" + seconds + "秒";
	}

	private static String dateText(Date date) {
		if (date == null) {
			return null;
		}
		SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd HH:mm");
		return format.format(date);
	}

	private static byte[] readFontBytes() {
		InputStream input = AnswerPdfExporter.class.getResourceAsStream(FONT_RESOURCE);
		if (input == null) {
			log.error("答卷 PDF 字体缺失，导出会直接报错: {}", FONT_RESOURCE);
			return null;
		}
		try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream(1024 * 1024)) {
			byte[] buffer = new byte[16384];
			int read;
			while ((read = in.read(buffer)) > 0) {
				out.write(buffer, 0, read);
			}
			byte[] bytes = out.toByteArray();
			log.info("答卷 PDF 字体已加载: {} ({} KB)", FONT_RESOURCE, Integer.valueOf(bytes.length / 1024));
			return bytes;
		}
		catch (IOException e) {
			log.error("读取答卷 PDF 字体失败: {}", FONT_RESOURCE, e);
			return null;
		}
	}

}
