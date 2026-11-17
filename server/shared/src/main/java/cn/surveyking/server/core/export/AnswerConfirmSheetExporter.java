package cn.surveyking.server.core.export;

import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.SurveySchema.QuestionType;
import cn.surveyking.server.domain.dto.UserInfo;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.state.RenderingMode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 单人「成绩确认单」：一页 A4，打印出来给学员核对成绩并签字。
 *
 * <p>
 * 和 {@link AnswerPdfExporter}（成绩单/答题卷）是两个用途，不要合并：
 * <ul>
 * <li>成绩单是「给你看过程」的多页答卷，几十题一叠纸；</li>
 * <li>确认单是「给你签字画押」的一张纸：只要总分、客观/主观小计、几句声明和两条签字线。</li>
 * </ul>
 * 现实场景决定版式：老师把一摞确认单发下去、学员签完收回来存档，所以必须<b>恰好一页</b>
 * （多页会出现「第二页没签字」的扯皮），不能有图片、不能有逐题明细。
 *
 * <p>
 * 为什么不复用 {@code AnswerPdfExporter.Layout}：那个排版器是为「多页 + 逐题流式排版」写的，
 * 本类只需要在一页上按绝对坐标画几块固定区域，直接用 PDPageContentStream 更直白。
 * 字体、缺字兜底（{@link AnswerPdfExporter#sanitize}）、分数/姓名的展示口径
 * （{@link AnswerPdfExporter#formatScore}、{@link AnswerPdfExporter#answererName}）
 * 一律复用成绩单那套，同一个学员在两张单子上的名字和分数必须一模一样。
 *
 * <p>
 * 拿不到的字段一律留空，绝不编：账号取自登录账号（没有就是空），作答轮次由调用方传入，
 * 交卷时间取 t_answer.create_at。空着老师知道「系统里没有」，编一个反而害人。
 */
public final class AnswerConfirmSheetExporter {

	private static final Logger log = LoggerFactory.getLogger(AnswerConfirmSheetExporter.class);

	/** 标题：和导出弹窗里的勾选项同名，老师一眼能对上 */
	public static final String TITLE = "成绩确认单";

	/** 声明文字：签字单的核心是一句能被追认的话，不要写成「请核对」这种软话 */
	private static final String DECLARATION = "本人已核对以上成绩与答卷，确认无误。";

	/** 页脚：说清这张纸的来历，避免被当成正式成绩证明流传出去 */
	private static final String FOOTER = "本确认单由系统按交卷数据生成，共一页；签字后由班级统一归档。";

	/** 默认及格线（分）：调用方没配时的口径，和成绩单/报表里的默认值保持一致 */
	public static final double DEFAULT_PASS_SCORE = 60d;

	/* ------ 版面（pt；A4 纵向 = 595.28 x 841.89） ------ */

	private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();

	private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();

	private static final float MARGIN_X = 56f;

	private static final float CONTENT_WIDTH = PAGE_WIDTH - 2f * MARGIN_X;

	private static final float TOP_Y = PAGE_HEIGHT - 58f;

	/** 页脚基线：正文低于这条线就说明版面溢出了（见 {@link #drawSignature} 的日志） */
	private static final float FOOTER_BASELINE = 44f;

	/** 两列信息表的列间距 */
	private static final float COLUMN_GAP = 26f;

	private static final float COLUMN_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 2f;

	private static final float SECOND_COLUMN_X = MARGIN_X + COLUMN_WIDTH + COLUMN_GAP;

	/** 标签列宽：「交卷时间」这种 4 字标签也能放下 */
	private static final float LABEL_WIDTH = 62f;

	/* ------ 字号 ------ */

	private static final float TITLE_SIZE = 24f;

	private static final float LABEL_SIZE = 9.5f;

	private static final float VALUE_SIZE = 11.5f;

	private static final float CARD_LABEL_SIZE = 10f;

	private static final float BIG_SCORE_SIZE = 38f;

	private static final float CARD_LINE_SIZE = 11f;

	private static final float PASS_SIZE = 18f;

	private static final float DECLARATION_SIZE = 13f;

	private static final float SIGN_LABEL_SIZE = 11f;

	private static final float FOOTER_SIZE = 8.5f;

	/* ------ 行距 / 间距 ------ */

	private static final float LINE_HEIGHT = 15.5f;

	private static final float ROW_PADDING = 12f;

	/** 签字横线上方预留的手写高度：任务口径要求 ≥80pt，成年人在横线上签名不能挤成一团 */
	private static final float HANDWRITE_HEIGHT = 92f;

	/** 「教师/管理员（盖章）」横线上方的高度 */
	private static final float STAMP_HEIGHT = 92f;

	/* ------ 颜色（打印友好，不用浅灰以外的装饰） ------ */

	private static final Color COLOR_TEXT = new Color(0x22, 0x22, 0x22);

	private static final Color COLOR_SOFT = new Color(0x6b, 0x6b, 0x6b);

	private static final Color COLOR_LINE = new Color(0x8a, 0x8a, 0x8a);

	private static final Color COLOR_HAIRLINE = new Color(0xd8, 0xd8, 0xd8);

	private static final Color COLOR_CARD = new Color(0xf4, 0xf4, 0xf4);

	private static final Color COLOR_PASS = new Color(0x1a, 0x7f, 0x37);

	private static final Color COLOR_FAIL = new Color(0xb3, 0x26, 0x1e);

	private static final Color COLOR_PARTIAL = new Color(0xb2, 0x6a, 0x00);

	private AnswerConfirmSheetExporter() {
	}

	/* ====== 导出选项 ====== */

	/**
	 * 确认单选项。用链式 setter 组装，避免调用方记参数顺序。
	 *
	 * <p>
	 * 为什么轮次和账号不放进 {@link AnswerView}：AnswerView 是答卷的通用视图，
	 * 里面没有 attemptNo（它在 t_answer 上），账号要额外查 t_account；
	 * 由手里已经有这些信息的调用方（导出任务）带过来，比让确认单自己去查库干净。
	 */
	public static final class ConfirmOptions {

		/** 及格线（分）：默认 {@link #DEFAULT_PASS_SCORE} */
		private Double passScore = Double.valueOf(DEFAULT_PASS_SCORE);

		/** 第几次作答（t_answer.attempt_no，从 0 开始）；null 表示不显示 */
		private Integer attemptNo;

		/** 登录账号（t_account.auth_account / 手机号）；null 表示留空 */
		private String account;

		public ConfirmOptions passScore(Double passScore) {
			if (passScore != null) {
				this.passScore = passScore;
			}
			return this;
		}

		public ConfirmOptions attemptNo(Integer attemptNo) {
			this.attemptNo = attemptNo;
			return this;
		}

		public ConfirmOptions account(String account) {
			this.account = account;
			return this;
		}

		public Double getPassScore() {
			return passScore;
		}

		public Integer getAttemptNo() {
			return attemptNo;
		}

		public String getAccount() {
			return account;
		}

	}

	/* ====== 入口 ====== */

	/**
	 * 渲染一页成绩确认单。
	 * @param project 试卷（取考试名称；可为空，为空时标题退回「考试」）
	 * @param answer 答卷（取姓名/时间/分数/examInfo 的逐题得分）
	 * @param className 班级名（可为空；学员换班后导出的历史答卷也可能没有班级）
	 * @param options 选项（及格线 / 作答轮次 / 账号），可为空
	 * @return PDF 字节内容
	 */
	public static byte[] renderConfirmSheet(ProjectView project, AnswerView answer, String className,
			ConfirmOptions options) {
		if (!AnswerPdfExporter.isFontAvailable()) {
			// 部署问题：和答卷 PDF 用同一句话，运维看到就知道是字体没进包
			throw new InternalServerError(AnswerPdfExporter.FONT_MISSING_MESSAGE);
		}
		if (answer == null) {
			throw new InternalServerError("生成成绩确认单失败：缺少答卷数据");
		}
		ConfirmOptions opts = options == null ? new ConfirmOptions() : options;
		try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream(24 * 1024)) {
			// 字体对象不能跨文档复用，但字节数组可以：和成绩单共用同一份字体字节
			PDType0Font font = PDType0Font.load(doc, new ByteArrayInputStream(AnswerPdfExporter.fontBytes()), true);
			PDPage page = new PDPage(PDRectangle.A4);
			doc.addPage(page);
			doc.getDocumentInformation().setTitle(TITLE + " - " + examTitle(project, answer));
			doc.getDocumentInformation().setCreator("SurveyKing");
			doc.getDocumentInformation().setProducer("SurveyKing / Apache PDFBox");
			try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
				Canvas canvas = new Canvas(stream, font);
				float y = drawHeader(canvas);
				y = drawInfoTable(canvas, project, answer, className, opts, y);
				y = drawScoreArea(canvas, answer, project, opts, y);
				y = drawDeclaration(canvas, y);
				drawSignature(canvas, y);
				drawFooter(canvas);
			}
			doc.save(out);
			return out.toByteArray();
		}
		catch (InternalServerError e) {
			throw e;
		}
		catch (IOException e) {
			throw new InternalServerError("生成成绩确认单失败：" + e.getMessage(), e);
		}
	}

	/* ====== 抬头 ====== */

	private static float drawHeader(Canvas canvas) throws IOException {
		float y = TOP_Y;
		float width = canvas.width(TITLE, TITLE_SIZE);
		canvas.textAt(TITLE, (PAGE_WIDTH - width) / 2f, y, TITLE_SIZE, true, COLOR_TEXT);
		y = y - 16f;
		// 单线：纸质单据的抬头习惯；1.2pt 比表格分割线粗，远看有「这是一份文件」的分量
		canvas.hline(MARGIN_X, PAGE_WIDTH - MARGIN_X, y, 1.2f, COLOR_TEXT);
		return y - 8f;
	}

	/* ====== 信息表 ====== */

	/**
	 * 两列三行的信息表：姓名/账号、班级/考试名称、交卷时间/作答轮次。
	 *
	 * <p>
	 * 只放确认身份与核对成绩必需的六项。手机号、IP、设备这些属于隐私/运维信息，
	 * 不该出现在要发给学员或张贴的纸上。
	 */
	private static float drawInfoTable(Canvas canvas, ProjectView project, AnswerView answer, String className,
			ConfirmOptions opts, float top) throws IOException {
		List<String[]> rows = new ArrayList<>();
		rows.add(new String[] { "姓名", answererName(answer), "账号", accountText(answer, opts) });
		rows.add(new String[] { "班级", trim(className), "考试名称", examTitle(project, answer) });
		rows.add(new String[] { "交卷时间", dateText(answer.getCreateAt()), "作答轮次", attemptText(answer, opts) });

		float y = top - ROW_PADDING;
		for (String[] row : rows) {
			float left = drawCell(canvas, row[0], row[1], MARGIN_X, y);
			float right = drawCell(canvas, row[2], row[3], SECOND_COLUMN_X, y);
			// 一行里两格高度取大的：长考试名会换行，右格不能压到下一行上
			y = y - Math.max(left, right) - ROW_PADDING;
			// 分隔线画在两行之间的空白中线上：贴着文字会显得拥挤，贴着上一行又像下划线
			canvas.hline(MARGIN_X, PAGE_WIDTH - MARGIN_X, y + ROW_PADDING / 2f, 0.6f, COLOR_HAIRLINE);
		}
		return y;
	}

	/** 画一格（标签 + 值），返回这一格占用的高度；值为空就只画标签，不留假数据 */
	private static float drawCell(Canvas canvas, String label, String value, float x, float top) throws IOException {
		canvas.textAt(label, x, top, LABEL_SIZE, false, COLOR_SOFT);
		float valueX = x + LABEL_WIDTH;
		float maxWidth = COLUMN_WIDTH - LABEL_WIDTH;
		List<String> lines = canvas.wrap(value, VALUE_SIZE, maxWidth);
		float y = top;
		for (String line : lines) {
			canvas.textAt(line, valueX, y, VALUE_SIZE, false, COLOR_TEXT);
			y = y - LINE_HEIGHT;
		}
		return Math.max(LINE_HEIGHT, top - y);
	}

	/** 账号：优先调用方给的登录账号，其次答卷里带的用户信息；都没有就留空（绝不拿用户 id 糊弄） */
	private static String accountText(AnswerView answer, ConfirmOptions opts) {
		if (hasText(opts.getAccount())) {
			return trim(opts.getAccount());
		}
		List<UserInfo> users = answer.getUsers();
		if (users != null) {
			for (UserInfo user : users) {
				if (user != null && hasText(user.getUsername())) {
					return trim(user.getUsername());
				}
			}
		}
		return null;
	}

	/** 作答轮次：attempt_no 从 0 开始，给人看要 +1；没有就留空 */
	private static String attemptText(AnswerView answer, ConfirmOptions opts) {
		// 优先用调用方传的（导出任务手里就是 t_answer 上的值），再退回答卷视图上带的
		Integer attemptNo = opts.getAttemptNo() != null ? opts.getAttemptNo() : answer.getAttemptNo();
		if (attemptNo == null) {
			return null;
		}
		int ordinal = attemptNo.intValue() + 1;
		return "第 " + (ordinal < 1 ? 1 : ordinal) + " 次";
	}

	/* ====== 得分区 ====== */

	/**
	 * 灰底得分卡片：大字总分 + 是否及格 + 客观/主观小计 + 及格线。
	 *
	 * <p>
	 * 客观/主观拆分口径：{@code examAnswerMode == manual} 的是人工批改题（主观），其余计分题算客观。
	 * 每题得分取 {@code examInfo.questionScore}，缺失按 0 —— 和成绩单版式完全一致，
	 * 否则同一个学员在两张单子上小计对不上，老师第一个就要来问。
	 */
	private static float drawScoreArea(Canvas canvas, AnswerView answer, ProjectView project, ConfirmOptions opts,
			float top) throws IOException {
		ScoreSummary summary = summarize(project, answer);
		float cardHeight = 124f;
		float cardTop = top - 16f;
		canvas.fillRect(MARGIN_X, cardTop - cardHeight, CONTENT_WIDTH, cardHeight, COLOR_CARD);

		// 左：大字总分。没算分时画「—」而不是 0：没批改和 0 分是两件事
		float innerLeft = MARGIN_X + 18f;
		canvas.textAt("总分", innerLeft, cardTop - 22f, CARD_LABEL_SIZE, false, COLOR_SOFT);
		// 没算分时写「未评分」而不是画一个大破折号：签字单上的分数是承诺，
		// 「还没出分」必须一眼看得出来，不能靠一个横杠让人以为看漏了
		boolean scored = answer.getExamScore() != null;
		String totalText = scored ? AnswerPdfExporter.formatScore(answer.getExamScore()) : "未评分";
		canvas.textAt(totalText, innerLeft, cardTop - 66f, scored ? BIG_SCORE_SIZE : 24f, true, COLOR_TEXT);
		if (summary.maxScore != null && summary.maxScore.doubleValue() > 0d) {
			float totalWidth = canvas.width(totalText, BIG_SCORE_SIZE);
			canvas.textAt("/ " + AnswerPdfExporter.formatScore(summary.maxScore) + " 分（卷面满分）",
					innerLeft + totalWidth + 10f, cardTop - 56f, CARD_LINE_SIZE, false, COLOR_SOFT);
		}

		// 右：是否及格。文字而不是色块：黑白打印机上色块全变灰，字不会。
		// 及格线跟在标签里而不是单独一行：数字位数多时（12.5 分 / 1000 分）单独一行会和小计撞在一起
		String pass = passText(answer, opts);
		Color passColor = passColor(answer, opts);
		String passLabel = "是否及格 · " + passLineText(summary, opts);
		canvas.textAt(passLabel, PAGE_WIDTH - MARGIN_X - 18f - canvas.width(passLabel, CARD_LABEL_SIZE),
				cardTop - 22f, CARD_LABEL_SIZE, false, COLOR_SOFT);
		canvas.textAt(pass, PAGE_WIDTH - MARGIN_X - 18f - canvas.width(pass, PASS_SIZE), cardTop - 58f, PASS_SIZE, true,
				passColor);

		// 第三行：客观/主观小计。这一行右侧是空的，所以两段文字不会和右边的及格信息撞
		float lineY = cardTop - 98f;
		canvas.textAt("客观题小计 " + AnswerPdfExporter.formatScore(Double.valueOf(summary.objectiveScore)) + " 分（"
				+ summary.objectiveCount + " 题）", innerLeft, lineY, CARD_LINE_SIZE, false, COLOR_TEXT);
		canvas.textAt("主观题小计 " + AnswerPdfExporter.formatScore(Double.valueOf(summary.subjectiveScore)) + " 分（"
				+ summary.subjectiveCount + " 题）", innerLeft + 210f, lineY, CARD_LINE_SIZE, false, COLOR_TEXT);

		float y = cardTop - cardHeight;
		if (summary.manualPending) {
			// 人工题没批完就签字是会被追责的，必须写在卡片下方，别塞进小字里
			y = y - 18f;
			canvas.textAt("注：卷内含人工批改题且尚未批改完，主观题小计为当前已得分，最终成绩以批改结果为准。", MARGIN_X, y,
					LABEL_SIZE, false, COLOR_PARTIAL);
		}
		return y;
	}

	/** 客观/主观小计与满分 */
	private static final class ScoreSummary {

		private double objectiveScore;

		private double subjectiveScore;

		private int objectiveCount;

		private int subjectiveCount;

		private Double maxScore;

		/** 卷内含人工题且还没批完 */
		private boolean manualPending;

	}

	private static ScoreSummary summarize(ProjectView project, AnswerView answer) {
		ScoreSummary summary = new ScoreSummary();
		List<SurveySchema> questions = new ArrayList<>();
		collectQuestions(project == null ? null : project.getSurvey(), questions);
		boolean graded = "graded".equals(answer.getGradeStatus());
		double maxTotal = 0d;
		boolean hasMax = false;
		for (SurveySchema schema : questions) {
			SurveySchema.Attribute attribute = schema.getAttribute();
			if (attribute == null) {
				continue;
			}
			Double max = attribute.getExamScore();
			if (max == null || max.doubleValue() <= 0d) {
				// 没设分值的题不参与小计与满分：算进去会让「小计之和 ≠ 总分」，老师会以为算错了
				continue;
			}
			hasMax = true;
			maxTotal = maxTotal + max.doubleValue();
			Double earned = earnedScore(answer, schema.getId());
			double value = earned == null ? 0d : earned.doubleValue();
			if (SurveySchema.ExamScoreMode.manual.equals(attribute.getExamAnswerMode())) {
				summary.subjectiveScore = summary.subjectiveScore + value;
				summary.subjectiveCount = summary.subjectiveCount + 1;
				if (!graded) {
					summary.manualPending = true;
				}
			}
			else {
				summary.objectiveScore = summary.objectiveScore + value;
				summary.objectiveCount = summary.objectiveCount + 1;
			}
		}
		summary.maxScore = hasMax ? Double.valueOf(maxTotal) : null;
		return summary;
	}

	/**
	 * 按卷面顺序收集计分题：只收 dataType（和成绩单的题号口径一致），
	 * 容器（Survey/Pagination/QuestionSet）继续往下钻，选项/填空位不算题。
	 */
	private static void collectQuestions(SurveySchema node, List<SurveySchema> out) {
		if (node == null) {
			return;
		}
		QuestionType type = node.getType();
		if (type != null && QuestionType.dataType().contains(type)) {
			out.add(node);
			return;
		}
		List<SurveySchema> children = node.getChildren();
		if (children == null) {
			return;
		}
		for (SurveySchema child : children) {
			collectQuestions(child, out);
		}
	}

	private static Double earnedScore(AnswerView answer, String questionId) {
		AnswerExamInfo examInfo = answer.getExamInfo();
		if (examInfo == null || examInfo.getQuestionScore() == null || questionId == null) {
			return null;
		}
		return examInfo.getQuestionScore().get(questionId);
	}

	private static String passText(AnswerView answer, ConfirmOptions opts) {
		Double total = answer.getExamScore();
		if (total == null) {
			return "—";
		}
		return total.doubleValue() >= passScore(opts) ? "及格" : "不及格";
	}

	private static Color passColor(AnswerView answer, ConfirmOptions opts) {
		Double total = answer.getExamScore();
		if (total == null) {
			return COLOR_SOFT;
		}
		return total.doubleValue() >= passScore(opts) ? COLOR_PASS : COLOR_FAIL;
	}

	private static double passScore(ConfirmOptions opts) {
		Double configured = opts.getPassScore();
		return configured == null ? DEFAULT_PASS_SCORE : configured.doubleValue();
	}

	private static String passLineText(ScoreSummary summary, ConfirmOptions opts) {
		StringBuilder text = new StringBuilder();
		text.append("及格线 ").append(AnswerPdfExporter.formatScore(Double.valueOf(passScore(opts)))).append(" 分");
		if (summary.maxScore != null && summary.maxScore.doubleValue() < passScore(opts)) {
			// 满分 50 的卷子按 60 分及格线判，全员不及格：把原因写在单子上，别让学员以为系统算错
			text.append("（高于卷面满分）");
		}
		return text.toString();
	}

	/* ====== 声明 / 签字栏 ====== */

	private static float drawDeclaration(Canvas canvas, float top) throws IOException {
		// 留一块明显的空白再写声明：卡片和小计挨太近，看起来像还有下文没有印出来
		float y = top - 84f;
		// 首行缩进两个字的宽度：中文正文的排版习惯，也让它看起来像「一句话」而不是一行标签
		canvas.textAt(DECLARATION, MARGIN_X + DECLARATION_SIZE * 2f, y, DECLARATION_SIZE, false, COLOR_TEXT);
		return y - 44f;
	}

	/**
	 * 签字栏：考生签名 + 日期两条横线（每条上方至少 80pt 手写高度），右下角再留一个教师/管理员盖章位。
	 *
	 * <p>
	 * 为什么盖章位放右下：确认单收回去是「学员签字 + 老师确认」两方留痕，
	 * 两个签字挤在同一行容易压到名字上；右下角是纸质表单的惯例位置。
	 */
	private static void drawSignature(Canvas canvas, float top) throws IOException {
		float labelY = top - 6f;
		// 左：考生签名（横线 268pt，够写下一个完整的姓名）
		canvas.textAt("考生签名：", MARGIN_X, labelY, SIGN_LABEL_SIZE, false, COLOR_TEXT);
		float signLineY = labelY - HANDWRITE_HEIGHT;
		canvas.hline(MARGIN_X, MARGIN_X + 268f, signLineY, 0.9f, COLOR_LINE);
		// 右：日期
		float dateX = MARGIN_X + 330f;
		canvas.textAt("日期：", dateX, labelY, SIGN_LABEL_SIZE, false, COLOR_TEXT);
		canvas.hline(dateX, PAGE_WIDTH - MARGIN_X, signLineY, 0.9f, COLOR_LINE);

		// 右下角：教师/管理员（盖章）。横线在标签下方，中间那 STAMP_HEIGHT 就是盖章的位置，
		// 不能让线穿过文字，也不能贴着考生签名（两份留痕混在一起就说不清是谁确认的）
		float stampLabelY = signLineY - 40f;
		String stampLabel = "教师/管理员（盖章）：";
		float stampLabelWidth = canvas.width(stampLabel, SIGN_LABEL_SIZE - 0.5f);
		float stampX = PAGE_WIDTH - MARGIN_X - Math.max(210f, stampLabelWidth + 80f);
		canvas.textAt(stampLabel, stampX, stampLabelY, SIGN_LABEL_SIZE - 0.5f, false, COLOR_TEXT);
		float stampLineY = stampLabelY - STAMP_HEIGHT;
		canvas.hline(stampX, PAGE_WIDTH - MARGIN_X, stampLineY, 0.9f, COLOR_LINE);

		float bottom = stampLineY;
		if (bottom < FOOTER_BASELINE + 18f) {
			// 版面溢出不该让整份导出失败（老师要的是文件），记一条日志留待调小字号
			log.warn("成绩确认单版面偏低（签字栏基线 {} pt），请检查字号/间距", Float.valueOf(bottom));
		}
	}

	private static void drawFooter(Canvas canvas) throws IOException {
		float width = canvas.width(FOOTER, FOOTER_SIZE);
		canvas.textAt(FOOTER, (PAGE_WIDTH - width) / 2f, FOOTER_BASELINE, FOOTER_SIZE, false, COLOR_SOFT);
	}

	/* ====== 文本/版面工具 ====== */

	/** 考试名称：卷头标题 > 问卷标题 > 项目名称，和成绩单抬头同一套口径 */
	private static String examTitle(ProjectView project, AnswerView answer) {
		if (project == null) {
			// 试卷被删了也可能走到这里（历史答卷还能导出），别为了一个标题把整份导出搞失败
			return "考试";
		}
		String title = AnswerPdfExporter.displayTitle(project, answer);
		return hasText(title) ? trim(title) : "考试";
	}

	private static String answererName(AnswerView answer) {
		String name = AnswerPdfExporter.answererName(answer);
		return hasText(name) ? trim(name) : null;
	}

	private static String dateText(Date date) {
		if (date == null) {
			return null;
		}
		return new SimpleDateFormat("yyyy-MM-dd HH:mm").format(date);
	}

	/** 拼 HTML 的脏数据见过太多：去标签 + 去首尾空白，宁可少显示也不要吐一坨标签 */
	private static String trim(String text) {
		if (text == null) {
			return null;
		}
		String cleaned = SchemaHelper.trimHtmlTag(text);
		return hasText(cleaned) ? cleaned.trim() : null;
	}

	private static boolean hasText(String text) {
		return text != null && !text.trim().isEmpty();
	}

	/**
	 * 绝对坐标画布：只做「在某个基线上写一段字 / 画一条线 / 填一块色」这几件事。
	 *
	 * <p>
	 * 断行只服务本页的两列信息表，所以刻意做得比成绩单的排版器简单：
	 * 贪心按字符累加，遇到空格优先在空格处断（考试名里夹英文单词时不会把单词劈成两半）。
	 */
	private static final class Canvas {

		private final PDPageContentStream stream;

		private final PDType0Font font;

		private Canvas(PDPageContentStream stream, PDType0Font font) {
			this.stream = stream;
			this.font = font;
		}

		/** 单行文本宽度（pt）：中文按字累加，拿不到字宽就按半个字估 */
		private float width(String text, float size) {
			if (text == null || text.isEmpty()) {
				return 0f;
			}
			String safe = AnswerPdfExporter.sanitize(text);
			float units = 0f;
			for (int i = 0; i < safe.length();) {
				int codePoint = safe.codePointAt(i);
				i = i + Character.charCount(codePoint);
				try {
					units = units + font.getStringWidth(new String(Character.toChars(codePoint)));
				}
				catch (Exception e) {
					units = units + 500f;
				}
			}
			return units * size / 1000f;
		}

		/** 按基线绝对定位写一行字；加粗用「填充 + 描边」模拟（字体只有一个字重） */
		private void textAt(String text, float x, float baseline, float size, boolean bold, Color color)
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
			// 最后一公里也得过白名单：漏一个 ✓ 或 emoji，PDFBox 就会抛异常把整份导出搞失败
			stream.showText(AnswerPdfExporter.sanitize(text));
			stream.endText();
		}

		/** 断行：空文本返回一个空行，保证行高计算不会变成 0 */
		private List<String> wrap(String text, float size, float maxWidth) {
			List<String> lines = new ArrayList<>();
			if (text == null || !hasText(text)) {
				lines.add("");
				return lines;
			}
			String normalized = AnswerPdfExporter.sanitize(text);
			StringBuilder current = new StringBuilder();
			float currentWidth = 0f;
			int lastSpace = -1;
			for (int i = 0; i < normalized.length();) {
				int codePoint = normalized.codePointAt(i);
				int charCount = Character.charCount(codePoint);
				String piece = normalized.substring(i, i + charCount);
				i = i + charCount;
				if (codePoint == '\n') {
					lines.add(current.toString());
					current.setLength(0);
					currentWidth = 0f;
					lastSpace = -1;
					continue;
				}
				float pieceWidth = width(piece, size);
				if (currentWidth + pieceWidth > maxWidth && current.length() > 0) {
					// 只有当空格紧挨着行尾时才在空格处断：混合中英文的考试名（「2026 年秋季…」）里
					// 空格往往在很靠前的位置，按空格断会留下一个孤零零的「2026」，比按字断更难看
					if (lastSpace > 0 && lastSpace >= current.length() - 3) {
						String head = current.substring(0, lastSpace);
						String tail = current.substring(lastSpace + 1);
						lines.add(head);
						current.setLength(0);
						current.append(tail);
						currentWidth = width(tail, size);
						lastSpace = -1;
					}
					else {
						lines.add(current.toString());
						current.setLength(0);
						currentWidth = 0f;
						lastSpace = -1;
					}
					if (" ".equals(piece)) {
						continue;
					}
				}
				if (" ".equals(piece)) {
					if (current.length() == 0) {
						// 行首的空格直接丢掉：换行后顶一个空格会让整列看起来没对齐
						continue;
					}
					lastSpace = current.length();
				}
				current.append(piece);
				currentWidth = currentWidth + pieceWidth;
			}
			lines.add(current.toString());
			return lines;
		}

		private void hline(float x1, float x2, float y, float lineWidth, Color color) throws IOException {
			stream.setStrokingColor(color);
			stream.setLineWidth(lineWidth);
			stream.moveTo(x1, y);
			stream.lineTo(x2, y);
			stream.stroke();
		}

		private void fillRect(float x, float y, float width, float height, Color color) throws IOException {
			stream.setNonStrokingColor(color);
			stream.addRect(x, y, width, height);
			stream.fill();
		}

	}

}
