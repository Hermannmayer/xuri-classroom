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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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

	/**
	 * 及格线的兜底值（分）：只在「调用方没配、也拿不到卷面满分」时使用。
	 *
	 * <p>
	 * 它不能再当成默认口径：满分 120 的卷子按 60 分及格，等于放水一半（实际及格线应是 72）。
	 * 真实默认值见 {@link #resolvePassScore(Double, Double)}。
	 */
	public static final double DEFAULT_PASS_SCORE = 60d;

	/** 默认及格线占卷面满分的比例：60% 及格是学校里的通用口径，也和后端报表的 PASS_RATE 一致 */
	private static final double PASS_RATE = 0.6d;

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

		/**
		 * 及格线（分）：{@code null} 表示「按卷面满分×60% 自动算」，取不到满分才回退
		 * {@link #DEFAULT_PASS_SCORE}。
		 *
		 * <p>
		 * 默认值从 60 改成 null 是这次修的核心：60 分放在满分 150 的卷子上是 40% 及格，
		 * 放在满分 50 的卷子上又全员不及格，只有跟着满分走才是对的。
		 */
		private Double passScore;

		/**
		 * 卷面满分（分）：可选。调用方手里已经有整卷总分（例如导出任务算过一遍）时传进来，
		 * 单页确认单就能直接按它算默认及格线；不传则由渲染器自己从卷面 schema 汇总。
		 */
		private Double maxScore;

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

		public ConfirmOptions maxScore(Double maxScore) {
			if (maxScore != null) {
				this.maxScore = maxScore;
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

		public Double getMaxScore() {
			return maxScore;
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
		String pass = passText(answer, opts, summary.maxScore);
		Color passColor = passColor(answer, opts, summary.maxScore);
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

	private static String passText(AnswerView answer, ConfirmOptions opts, Double maxScore) {
		Double total = answer.getExamScore();
		if (total == null) {
			return "—";
		}
		return isPassed(total, opts, maxScore) ? "及格" : "不及格";
	}

	private static Color passColor(AnswerView answer, ConfirmOptions opts, Double maxScore) {
		Double total = answer.getExamScore();
		if (total == null) {
			return COLOR_SOFT;
		}
		return isPassed(total, opts, maxScore) ? COLOR_PASS : COLOR_FAIL;
	}

	/**
	 * 及格判定：总分缺失算未知（返回 false，但调用方要显示「未评分」而不是「不及格」）。
	 *
	 * <p>
	 * 公开：导出任务要按同一条及格线填名册的「是否及格」列，两边各写一份迟早会分叉。
	 * 及格线用 {@code options} 上的 passScore / maxScore 推算；渲染确认单时用带
	 * {@code maxScore} 的重载把卷面满分一起传进来，两处口径才会真的一致。
	 */
	public static boolean isPassed(Double total, ConfirmOptions options) {
		return isPassed(total, options, null);
	}

	/**
	 * 及格判定（已知卷面满分时用这个重载）。
	 * @param total 总分，null 表示还没出分 → 一律 false，由调用方显示「未评分」
	 * @param options 选项（显式 passScore 优先，其次它自带的 maxScore）
	 * @param maxScore 卷面满分，可为空：options 里也没给时用它算默认及格线
	 * @return 是否达到及格线
	 */
	public static boolean isPassed(Double total, ConfirmOptions options, Double maxScore) {
		if (total == null) {
			return false;
		}
		return total.doubleValue() >= passScore(options, maxScore);
	}

	/**
	 * 及格线的唯一算法：显式配置 &gt; 卷面满分×60%（保留 1 位小数）&gt; {@link #DEFAULT_PASS_SCORE}。
	 *
	 * <p>
	 * 为什么按比例而不是继续写死 60：满分 120 的卷子 60 分才及格等于放水一半，
	 * 满分 50 的卷子又全员不及格。取不到满分（老数据没有 examScore、题目没配分）时才回退 60，
	 * 因为「不知道满分」的情况下 60 仍然是最不坏的口径。
	 * @param configured 调用方显式指定的及格线，null 表示没指定
	 * @param maxScore 卷面满分，null / 非正数表示取不到
	 * @return 及格线（分）
	 */
	static double resolvePassScore(Double configured, Double maxScore) {
		if (configured != null) {
			return configured.doubleValue();
		}
		if (maxScore != null && maxScore.doubleValue() > 0d) {
			// 保留 1 位小数：满分 120.5 的 60% 是 72.3，格子上写 72.30000000000001 会显得系统不靠谱
			return Math.round(maxScore.doubleValue() * PASS_RATE * 10d) / 10d;
		}
		return DEFAULT_PASS_SCORE;
	}

	/** 及格线：options 自带的 maxScore 优先，其次调用方传进来的卷面满分 */
	private static double passScore(ConfirmOptions opts, Double maxScore) {
		ConfirmOptions options = opts == null ? new ConfirmOptions() : opts;
		Double known = options.getMaxScore() != null && options.getMaxScore().doubleValue() > 0d ? options.getMaxScore()
				: maxScore;
		return resolvePassScore(options.getPassScore(), known);
	}

	/** 及格线（没有卷面满分可用的场景，例如名册副标题） */
	private static double passScore(ConfirmOptions opts) {
		return passScore(opts, null);
	}

	/**
	 * 得分卡片上的「是否及格 · 及格线 X 分」。
	 *
	 * <p>
	 * 默认及格线是算出来的（满分×60%）时把算式写出来：学员看到「及格线 72 分」，
	 * 会拿满分 120 去核 60 分对不对，写清「满分 120 的 60%」省掉一轮解释。
	 */
	private static String passLineText(ScoreSummary summary, ConfirmOptions opts) {
		ConfirmOptions options = opts == null ? new ConfirmOptions() : opts;
		Double max = options.getMaxScore() != null && options.getMaxScore().doubleValue() > 0d ? options.getMaxScore()
				: summary.maxScore;
		double line = resolvePassScore(options.getPassScore(), max);
		StringBuilder text = new StringBuilder();
		text.append("及格线 ").append(AnswerPdfExporter.formatScore(Double.valueOf(line))).append(" 分");
		if (max != null && max.doubleValue() > 0d) {
			if (options.getPassScore() != null) {
				if (max.doubleValue() < line) {
					// 满分 50 的卷子按 60 分及格线判，全员不及格：把原因写在单子上，别让学员以为系统算错
					text.append("（高于卷面满分）");
				}
			}
			else {
				text.append("（满分 ").append(AnswerPdfExporter.formatScore(max)).append(" 的 60%）");
			}
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

	/* ====== 名册版：整班一张表（每人一行，签名手写） ====== */

	/**
	 * 名册里的一行：姓名、班级、总分、客观/主观小计、是否及格（满分可选）。
	 *
	 * <p>
	 * 为什么由调用方（导出任务）填好，而不是把 AnswerView 传进来自己算：
	 * 名册要的是「每份答卷一行」的最终口径，这些数字导出任务本来就要算一遍；
	 * 让渲染器再遍历一次 schema，同一批答卷要算两遍，两张纸上的分数还容易对不上。
	 */
	public static final class Entry {

		private String name;

		private String className;

		private Double totalScore;

		private double objectiveScore;

		private double subjectiveScore;

		private boolean passed;

		/** 卷面满分，可选：给了就在总分格显示「42.5 / 50」 */
		private Double maxScore;

		public Entry name(String name) {
			this.name = name;
			return this;
		}

		public Entry className(String className) {
			this.className = className;
			return this;
		}

		public Entry totalScore(Double totalScore) {
			this.totalScore = totalScore;
			return this;
		}

		public Entry objectiveScore(double objectiveScore) {
			this.objectiveScore = objectiveScore;
			return this;
		}

		public Entry subjectiveScore(double subjectiveScore) {
			this.subjectiveScore = subjectiveScore;
			return this;
		}

		public Entry passed(boolean passed) {
			this.passed = passed;
			return this;
		}

		public Entry maxScore(Double maxScore) {
			this.maxScore = maxScore;
			return this;
		}

		public String getName() {
			return name;
		}

		public String getClassName() {
			return className;
		}

		public Double getTotalScore() {
			return totalScore;
		}

		public double getObjectiveScore() {
			return objectiveScore;
		}

		public double getSubjectiveScore() {
			return subjectiveScore;
		}

		public boolean isPassed() {
			return passed;
		}

		public Double getMaxScore() {
			return maxScore;
		}

	}

	/** 名册每行高度：22pt = 一行 9.5pt 的字 + 上下各 6pt，手写签名不会挤到隔壁行 */
	private static final float ROSTER_ROW_HEIGHT = 22f;

	/** 每页最多 24 行：再密下去签名就没地方落笔（横向 A4 更矮，实际容量按可用高度算） */
	private static final int ROSTER_MAX_ROWS_PER_PAGE = 24;

	private static final float ROSTER_HEADER_HEIGHT = 24f;

	private static final float ROSTER_MARGIN_X = 46f;

	private static final float ROSTER_MARGIN_TOP = 40f;

	private static final float ROSTER_MARGIN_BOTTOM = 42f;

	private static final float ROSTER_TITLE_SIZE = 18f;

	private static final float ROSTER_SUBTITLE_SIZE = 9f;

	private static final float ROSTER_CELL_SIZE = 9.5f;

	/** 最后一行下面那句声明要占的高度（含行距） */
	private static final float ROSTER_DECLARATION_SPACE = 30f;

	private static final String ROSTER_DECLARATION = "以上成绩经考生本人核对无误，签名即确认。";

	/**
	 * 渲染「成绩确认单」名册：整班一张表，每人一行，最后一列签名留空给考生手写。
	 *
	 * <p>
	 * 版式跟着班级数走：<b>单班纵向 A4，跨班横向 A4</b>。跨班要多一列「班级」，
	 * 纵向排 8 列会把签名格子压到 130pt 以下 —— 一页纸上挤满签不了字的名字等于没做。
	 *
	 * <p>
	 * 分页：每页最多 {@value #ROSTER_MAX_ROWS_PER_PAGE} 行（横向按可用高度更少），
	 * 翻页时<b>重画表头</b>：老师拿着第二页对照表头找列，比记住列顺序靠谱。
	 * @param project 试卷（取考试名称；可为空）
	 * @param rows 名册行（空列表直接报错：生成一张只有表头的空表没有意义）
	 * @param className 班级名（单班时进副标题；跨班时用「N 个班」代替）
	 * @param options 选项（及格线用于副标题）
	 * @return PDF 字节内容
	 */
	public static byte[] renderRoster(ProjectView project, List<Entry> rows, String className, ConfirmOptions options) {
		if (!AnswerPdfExporter.isFontAvailable()) {
			throw new InternalServerError(AnswerPdfExporter.FONT_MISSING_MESSAGE);
		}
		if (rows == null || rows.isEmpty()) {
			throw new InternalServerError("没有可生成确认单的答卷");
		}
		ConfirmOptions opts = options == null ? new ConfirmOptions() : options;
		boolean crossClass = classCount(rows) > 1;
		PDRectangle pageSize = crossClass
				? new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth())
				: new PDRectangle(PDRectangle.A4.getWidth(), PDRectangle.A4.getHeight());
		List<Column> columns = rosterColumns(crossClass, pageSize.getWidth() - 2f * ROSTER_MARGIN_X);
		String title = examTitle(project);
		try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024)) {
			PDType0Font font = PDType0Font.load(doc, new ByteArrayInputStream(AnswerPdfExporter.fontBytes()), true);
			doc.getDocumentInformation().setTitle(TITLE + " - " + title);
			doc.getDocumentInformation().setCreator("SurveyKing");
			doc.getDocumentInformation().setProducer("SurveyKing / Apache PDFBox");
			int index = 0;
			int pageNo = 0;
			while (index < rows.size()) {
				pageNo = pageNo + 1;
				PDPage page = new PDPage(pageSize);
				doc.addPage(page);
				try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
					Canvas canvas = new Canvas(stream, font);
					float tableTop = pageNo == 1
							? drawRosterHead(canvas, pageSize,
									rosterSubtitle(title, className, crossClass, rows, opts))
							: drawRosterContinuedHead(canvas, pageSize);
					int remaining = rows.size() - index;
					int count = Math.min(rosterCapacity(tableTop), remaining);
					// 最后一页给声明句留位置：宁可少排一行翻到下一页，也不能让声明压在页脚上
					if (count == remaining && count > 1
							&& tableTop - ROSTER_HEADER_HEIGHT - count * ROSTER_ROW_HEIGHT
									- ROSTER_DECLARATION_SPACE < ROSTER_MARGIN_BOTTOM) {
						count = count - 1;
					}
					float tableBottom = drawRosterTable(canvas, columns, tableTop, index, count, rows, crossClass);
					index = index + count;
					if (index >= rows.size()) {
						drawRosterDeclaration(canvas, tableBottom - 16f);
					}
					drawRosterFooter(canvas, pageSize, pageNo);
				}
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

	/**
	 * 从一份答卷算出名册里的一行：口径与单人确认单完全一致（同一条及格线、同一个总分），
	 * 否则同一个学员在「单人单」和「班级名册」上的分数会对不上。
	 */
	public static Entry entryOf(ProjectView project, AnswerView answer, String className, ConfirmOptions options) {
		ScoreSummary summary = summarize(project, answer);
		return new Entry().name(answererName(answer)).className(trim(className)).totalScore(answer.getExamScore())
				.objectiveScore(summary.objectiveScore).subjectiveScore(summary.subjectiveScore)
				// 名册每行的「是否及格」与单人确认单同一条及格线：卷面满分在这里是现成的
				.passed(isPassed(answer.getExamScore(), options, summary.maxScore)).maxScore(summary.maxScore);
	}

	/* ------ 名册内部实现 ------ */

	/** 表格一列：标题、宽度、对齐（0 左 / 1 中 / 2 右） */
	private static final class Column {

		private final String title;

		private final float width;

		private final int align;

		private Column(String title, float width, int align) {
			this.title = title;
			this.width = width;
			this.align = align;
		}

	}

	/**
	 * 列宽：签名列吃掉剩下的全部宽度。
	 *
	 * <p>
	 * 固定列宽是刻意不按内容自适应的：几十行数据里只要有一个长名字就会把整列撑开，
	 * 表格每次导出的列位置都不一样，老师没法拿上一张纸对照。
	 */
	private static List<Column> rosterColumns(boolean withClass, float contentWidth) {
		List<Column> columns = new ArrayList<>();
		columns.add(new Column("序号", 32f, 1));
		columns.add(new Column("姓名", withClass ? 92f : 82f, 0));
		if (withClass) {
			columns.add(new Column("班级", 112f, 0));
		}
		columns.add(new Column("总分", withClass ? 74f : 64f, 2));
		columns.add(new Column("客观", withClass ? 68f : 58f, 2));
		columns.add(new Column("主观", withClass ? 68f : 58f, 2));
		columns.add(new Column("是否及格", withClass ? 70f : 62f, 1));
		float used = 0f;
		for (Column column : columns) {
			used = used + column.width;
		}
		columns.add(new Column("考生签名", Math.max(96f, contentWidth - used), 0));
		return columns;
	}

	/** 每页能排多少行：先按可用高度算，再夹到 24 行以内 */
	private static int rosterCapacity(float tableTop) {
		float usable = tableTop - ROSTER_HEADER_HEIGHT - ROSTER_MARGIN_BOTTOM;
		int fit = (int) Math.floor(usable / ROSTER_ROW_HEIGHT);
		return Math.max(1, Math.min(ROSTER_MAX_ROWS_PER_PAGE, fit));
	}

	/** 一共涉及几个班：>1 才需要「班级」列和横向版式 */
	private static int classCount(List<Entry> rows) {
		Set<String> names = new HashSet<>();
		for (Entry entry : rows) {
			if (entry != null && hasText(entry.getClassName())) {
				names.add(entry.getClassName());
			}
		}
		return names.size();
	}

	/** 首页抬头：标题 + 一行小字（考试名称 / 班级 / 导出时间 / 及格线）+ 粗线 */
	private static float drawRosterHead(Canvas canvas, PDRectangle pageSize, String subtitle) throws IOException {
		float contentWidth = pageSize.getWidth() - 2f * ROSTER_MARGIN_X;
		float y = pageSize.getHeight() - ROSTER_MARGIN_TOP;
		float titleWidth = canvas.width(TITLE, ROSTER_TITLE_SIZE);
		canvas.textAt(TITLE, ROSTER_MARGIN_X + (contentWidth - titleWidth) / 2f, y, ROSTER_TITLE_SIZE, true,
				COLOR_TEXT);
		y = y - 18f;
		for (String line : canvas.wrap(subtitle, ROSTER_SUBTITLE_SIZE, contentWidth)) {
			float lineWidth = canvas.width(line, ROSTER_SUBTITLE_SIZE);
			canvas.textAt(line, ROSTER_MARGIN_X + (contentWidth - lineWidth) / 2f, y, ROSTER_SUBTITLE_SIZE, false,
					COLOR_SOFT);
			y = y - 12f;
		}
		canvas.hline(ROSTER_MARGIN_X, pageSize.getWidth() - ROSTER_MARGIN_X, y, 1f, COLOR_TEXT);
		return y - 10f;
	}

	/** 续页抬头：只写「成绩确认单（续）」，别再重复一遍副标题（翻页时那行信息没用） */
	private static float drawRosterContinuedHead(Canvas canvas, PDRectangle pageSize) throws IOException {
		float contentWidth = pageSize.getWidth() - 2f * ROSTER_MARGIN_X;
		float y = pageSize.getHeight() - ROSTER_MARGIN_TOP;
		String title = TITLE + "（续）";
		float titleWidth = canvas.width(title, ROSTER_TITLE_SIZE - 3f);
		canvas.textAt(title, ROSTER_MARGIN_X + (contentWidth - titleWidth) / 2f, y, ROSTER_TITLE_SIZE - 3f, true,
				COLOR_TEXT);
		y = y - 12f;
		canvas.hline(ROSTER_MARGIN_X, pageSize.getWidth() - ROSTER_MARGIN_X, y, 1f, COLOR_TEXT);
		return y - 10f;
	}

	private static String rosterSubtitle(String title, String className, boolean crossClass, List<Entry> rows,
			ConfirmOptions opts) {
		List<String> parts = new ArrayList<>();
		parts.add("考试名称：" + title);
		if (crossClass) {
			parts.add("班级：" + classCount(rows) + " 个班");
		}
		else if (hasText(className)) {
			parts.add("班级：" + trim(className));
		}
		parts.add("导出时间：" + new SimpleDateFormat("yyyy-MM-dd HH:mm").format(new Date()));
		parts.add(rosterPassLine(rows, opts));
		return String.join("    ", parts);
	}

	/**
	 * 名册副标题的及格线文案（如「及格线：72 分（满分 120 的 60%）」）。
	 *
	 * <p>
	 * 必须和每行的「是否及格」用同一条线：每行的满分由 {@link #entryOf} 从卷面汇总得到，
	 * 这里取「所有行都一样」的那个满分；各行满分不同（整卷导出混了几个班、卷子还不一样）时
	 * 不拿任何一行的满分去当整表的满分——写「及格线 72 分」配一张 50 分满分的表，
	 * 老师第一反应就是系统算错了。
	 */
	private static String rosterPassLine(List<Entry> rows, ConfirmOptions opts) {
		ConfirmOptions options = opts == null ? new ConfirmOptions() : opts;
		Double max = options.getMaxScore() != null && options.getMaxScore().doubleValue() > 0d ? options.getMaxScore()
				: commonMaxScore(rows);
		double line = resolvePassScore(options.getPassScore(), max);
		String text = "及格线：" + AnswerPdfExporter.formatScore(Double.valueOf(line)) + " 分";
		if (max != null && max.doubleValue() > 0d && options.getPassScore() == null) {
			text = text + "（满分 " + AnswerPdfExporter.formatScore(max) + " 的 60%）";
		}
		return text;
	}

	/** 整表统一的卷面满分：所有行报的是同一个正数才返回它，否则返回 null（不猜） */
	private static Double commonMaxScore(List<Entry> rows) {
		Double common = null;
		for (Entry entry : rows) {
			Double max = entry == null ? null : entry.getMaxScore();
			if (max == null || max.doubleValue() <= 0d) {
				continue;
			}
			if (common == null) {
				common = max;
			}
			else if (Math.abs(common.doubleValue() - max.doubleValue()) > 1e-6d) {
				return null;
			}
		}
		return common;
	}

	/** 画表头 + 本页的数据行 + 网格线，返回表格底边 */
	private static float drawRosterTable(Canvas canvas, List<Column> columns, float tableTop, int startIndex, int count,
			List<Entry> rows, boolean withClass) throws IOException {
		float width = 0f;
		for (Column column : columns) {
			width = width + column.width;
		}
		float right = ROSTER_MARGIN_X + width;
		float headerBottom = tableTop - ROSTER_HEADER_HEIGHT;
		float tableBottom = headerBottom - count * ROSTER_ROW_HEIGHT;

		// 表头：浅底 + 粗体；翻页时也重画一遍，第二页照样能对上列
		canvas.fillRect(ROSTER_MARGIN_X, headerBottom, width, ROSTER_HEADER_HEIGHT, COLOR_CARD);
		float x = ROSTER_MARGIN_X;
		for (Column column : columns) {
			String fitted = canvas.ellipsis(column.title, ROSTER_CELL_SIZE, column.width - 8f);
			canvas.textAt(fitted, columnTextX(canvas, column, x, fitted), tableTop - 16f, ROSTER_CELL_SIZE, true,
					COLOR_TEXT);
			x = x + column.width;
		}

		for (int i = 0; i < count; i++) {
			float rowTop = headerBottom - i * ROSTER_ROW_HEIGHT;
			float baseline = rowTop - 15f;
			Entry entry = rows.get(startIndex + i);
			x = ROSTER_MARGIN_X;
			for (int c = 0; c < columns.size(); c++) {
				Column column = columns.get(c);
				String text = rosterCellText(entry, startIndex + i, c, withClass);
				if (hasText(text)) {
					String fitted = canvas.ellipsis(text, ROSTER_CELL_SIZE, column.width - 8f);
					canvas.textAt(fitted, columnTextX(canvas, column, x, fitted), baseline, ROSTER_CELL_SIZE, false,
							rosterCellColor(entry, c, withClass));
				}
				x = x + column.width;
			}
		}

		// 竖线：签名列就靠这两条竖线留出手写空间，格子里什么都不画
		x = ROSTER_MARGIN_X;
		canvas.vline(x, tableTop, tableBottom, 0.7f, COLOR_LINE);
		for (Column column : columns) {
			x = x + column.width;
			canvas.vline(x, tableTop, tableBottom, 0.7f, COLOR_LINE);
		}
		// 横线：表格顶 / 表头底（粗）/ 每行底（细）
		canvas.hline(ROSTER_MARGIN_X, right, tableTop, 1f, COLOR_TEXT);
		canvas.hline(ROSTER_MARGIN_X, right, headerBottom, 0.8f, COLOR_LINE);
		for (int i = 1; i <= count; i++) {
			canvas.hline(ROSTER_MARGIN_X, right, headerBottom - i * ROSTER_ROW_HEIGHT, 0.5f, COLOR_HAIRLINE);
		}
		return tableBottom;
	}

	/** 单元格的内容：序号 / 姓名 / [班级] / 总分 / 客观 / 主观 / 是否及格 / 签名（空） */
	private static String rosterCellText(Entry entry, int index, int column, boolean withClass) {
		if (column == 0) {
			return String.valueOf(index + 1);
		}
		if (column == 1) {
			return entry.getName();
		}
		if (withClass && column == 2) {
			return entry.getClassName();
		}
		int offset = column - (withClass ? 3 : 2);
		switch (offset) {
			case 0:
				return totalCell(entry);
			case 1:
				return AnswerPdfExporter.formatScore(Double.valueOf(entry.getObjectiveScore()));
			case 2:
				return AnswerPdfExporter.formatScore(Double.valueOf(entry.getSubjectiveScore()));
			case 3:
				// 总分缺失时写「未评分」而不是「不及格」：没批完和考砸了是两件事
				if (entry.getTotalScore() == null) {
					return "未评分";
				}
				return entry.isPassed() ? "及格" : "不及格";
			default:
				return null;
		}
	}

	private static Color rosterCellColor(Entry entry, int column, boolean withClass) {
		int passColumn = withClass ? 6 : 5;
		if (column == passColumn) {
			if (entry.getTotalScore() == null) {
				return COLOR_SOFT;
			}
			return entry.isPassed() ? COLOR_PASS : COLOR_FAIL;
		}
		return column == 0 ? COLOR_SOFT : COLOR_TEXT;
	}

	private static String totalCell(Entry entry) {
		Double total = entry.getTotalScore();
		if (total == null) {
			return "未评分";
		}
		String text = AnswerPdfExporter.formatScore(total);
		if (entry.getMaxScore() != null && entry.getMaxScore().doubleValue() > 0d) {
			return text + " / " + AnswerPdfExporter.formatScore(entry.getMaxScore());
		}
		return text;
	}

	private static float columnTextX(Canvas canvas, Column column, float left, String text) {
		float textWidth = canvas.width(text, ROSTER_CELL_SIZE);
		if (column.align == 1) {
			return Math.max(left + 2f, left + (column.width - textWidth) / 2f);
		}
		if (column.align == 2) {
			return Math.max(left + 2f, left + column.width - 6f - textWidth);
		}
		return left + 6f;
	}

	private static void drawRosterDeclaration(Canvas canvas, float y) throws IOException {
		canvas.textAt(ROSTER_DECLARATION, ROSTER_MARGIN_X + ROSTER_CELL_SIZE * 2f, y, DECLARATION_SIZE - 2f, false,
				COLOR_TEXT);
	}

	private static void drawRosterFooter(Canvas canvas, PDRectangle pageSize, int pageNo) throws IOException {
		String text = "第 " + pageNo + " 页";
		float width = canvas.width(text, 8f);
		canvas.textAt(text, (pageSize.getWidth() - width) / 2f, 24f, 8f, false, COLOR_SOFT);
	}

	/* ====== 文本/版面工具 ====== */

	/** 考试名称（名册用：没有具体答卷，口径与单人确认单一致） */
	private static String examTitle(ProjectView project) {
		if (project == null) {
			return "考试";
		}
		String title = AnswerPdfExporter.displayTitle(project, null);
		return hasText(title) ? trim(title) : "考试";
	}

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

		/** 竖线：名册的列分隔线，也是签名列「留空手写」的唯一边界 */
		private void vline(float x, float yTop, float yBottom, float lineWidth, Color color) throws IOException {
			stream.setStrokingColor(color);
			stream.setLineWidth(lineWidth);
			stream.moveTo(x, yTop);
			stream.lineTo(x, yBottom);
			stream.stroke();
		}

		/**
		 * 单元格超宽时按字截断并补「…」：表格格子不能换行，一个长名字把列撑开，
		 * 整张表的列位置就每次都不同了（老师没法拿上一张纸对照）。
		 */
		private String ellipsis(String text, float size, float maxWidth) {
			if (text == null) {
				return "";
			}
			String safe = AnswerPdfExporter.sanitize(text);
			if (width(safe, size) <= maxWidth) {
				return safe;
			}
			StringBuilder builder = new StringBuilder();
			float current = 0f;
			for (int i = 0; i < safe.length();) {
				int codePoint = safe.codePointAt(i);
				int charCount = Character.charCount(codePoint);
				String piece = safe.substring(i, i + charCount);
				i = i + charCount;
				float pieceWidth = width(piece, size);
				// 给末尾的省略号留出位置
				if (current + pieceWidth > maxWidth - size * 0.8f) {
					break;
				}
				builder.append(piece);
				current = current + pieceWidth;
			}
			return builder.append('…').toString();
		}

		private void fillRect(float x, float y, float width, float height, Color color) throws IOException {
			stream.setNonStrokingColor(color);
			stream.addRect(x, y, width, height);
			stream.fill();
		}

	}

}
