package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiJobService;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiPaperCheckRequest;
import cn.surveyking.server.domain.dto.AiPaperCheckView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.service.AiPaperCheckService;
import cn.surveyking.server.service.AiUsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 试卷质检：考前给一份编好的卷子做体检，<b>能算的全部由后端算，模型只补「教学法」这一层</b>。
 *
 * <p>为什么这么切：缺分值、缺答案、重复题、总分为 0、题型单一这五件事是<b>确定的事实</b>，
 * 让模型判断既贵又不可复现——同一份卷子跑两次结论还可能不一样；老师要的是「哪几题、怎么改」，
 * 这种活儿代码比模型靠谱。模型只负责它擅长的部分：难度梯度、考点覆盖、分值分布合理性。
 *
 * <p>三条硬约束：
 * <ol>
 * <li><b>确定性检查永远执行</b>，不花 token、不受模型可用性影响；每条问题都带 kind / severity /
 * 题号 / 处理建议，前端能直接照着改；</li>
 * <li><b>模型失败不能整单失败</b>：模型报错、被限额、返回的 JSON 不合法时，只记一条 warn，
 * 结果退回「确定性检查 + 按问题扣分」的分数——老师至少知道自己卷子上有 3 道题没答案；</li>
 * <li><b>模型问题只当质量建议</b>：一律 {@code severity=warning}，且只能<b>压低</b>分数（
 * {@code min(系统分, 模型分)}）——卷子里真有 3 处缺答案时，模型说「挺好」也不算数。</li>
 * </ol>
 *
 * <p>不做什么：不改卷子（只读 schema，建议要老师自己在编辑器里改）、不评排版与措辞、
 * 不把学员数据发给模型（体检只看题目本身）。
 *
 * @author ai-actions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiPaperCheckServiceImpl implements AiPaperCheckService {

	/** 提示词模板 id（{@code server/ai/src/main/resources/prompts/paper-check.md}） */
	private static final String PROMPT_CHECK = "paper-check";

	/** 选择题：正确答案只能标在选项上（判分器 {@code AnswerScoreEvaluator} 只读选项上的 examCorrectAnswer） */
	private static final Set<SurveySchema.QuestionType> CHOICE_TYPES = EnumSet.of(SurveySchema.QuestionType.Radio,
			SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Judge, SurveySchema.QuestionType.Select);

	/** 参与计分的题型：其它题型（富文本段落、上传、签名…）没有分值也没有标准答案，体检它们只会刷噪音 */
	private static final Set<SurveySchema.QuestionType> SCORED_TYPES = EnumSet.of(SurveySchema.QuestionType.Radio,
			SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Judge, SurveySchema.QuestionType.Select,
			SurveySchema.QuestionType.FillBlank, SurveySchema.QuestionType.MultipleBlank,
			SurveySchema.QuestionType.Textarea, SurveySchema.QuestionType.HorzBlank);

	/** blocker 每条扣几分 */
	private static final int BLOCKER_PENALTY = 10;

	/** warning 每条扣几分（扣分按「问题条目」算，不按题目数算：修复成本跟问题种类相关） */
	private static final int WARNING_PENALTY = 4;

	/** 进提示词的最大题量：60 题以后模型也看不出更多名堂，只会把 token 烧光 */
	private static final int MAX_PROMPT_QUESTIONS = 60;

	/** 进提示词的题干摘要长度 */
	private static final int MAX_SUMMARY_CHARS = 50;

	/** 模型最多给几条问题 */
	private static final int MAX_MODEL_ISSUES = 5;

	/** 一条消息里最多列几个题号 */
	private static final int MAX_LISTED = 8;

	/** 重复题最多列几组（再多了消息读不下去，但 issue 里的题号是全的） */
	private static final int MAX_DUPLICATE_GROUPS = 3;

	/** 模型给的一段话最多保留多少字 */
	private static final int MAX_TEXT_CHARS = 200;

	/** 一条 issue 最多带多少个题号 */
	private static final int MAX_ISSUE_IDS = 60;

	/** 少于此题数不谈「题型单一」：一两道题的小测没必要凑题型 */
	private static final int MIN_QUESTIONS_FOR_TYPE_MIX = 3;

	private static final String SEVERITY_BLOCKER = "blocker";

	private static final String SEVERITY_WARNING = "warning";

	/** 题型枚举名 → 中文名（提示词与消息里都用中文，老师才看得懂） */
	private static final Map<String, String> TYPE_LABELS = new LinkedHashMap<>();

	static {
		TYPE_LABELS.put(SurveySchema.QuestionType.Radio.name(), "单选题");
		TYPE_LABELS.put(SurveySchema.QuestionType.Checkbox.name(), "多选题");
		TYPE_LABELS.put(SurveySchema.QuestionType.Judge.name(), "判断题");
		TYPE_LABELS.put(SurveySchema.QuestionType.Select.name(), "下拉选择题");
		TYPE_LABELS.put(SurveySchema.QuestionType.FillBlank.name(), "填空题");
		TYPE_LABELS.put(SurveySchema.QuestionType.MultipleBlank.name(), "多项填空题");
		TYPE_LABELS.put(SurveySchema.QuestionType.Textarea.name(), "简答题");
		TYPE_LABELS.put(SurveySchema.QuestionType.HorzBlank.name(), "横向填空题");
	}

	private final AiAssistSupport support;

	private final AiJobService aiJobService;

	@Override
	public String check(AiPaperCheckRequest request) {
		if (request == null || !StringUtils.hasText(request.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要体检的试卷");
		}
		String projectId = request.getProjectId().trim();
		String userId = SecurityContextUtils.getUserId();
		// 提交时就判一次额度：体检要读整卷 + 调一次模型，别让老师等完才看到「今天用完了」
		support.assertQuota(userId);
		// 项目行级权限与 schema 都在请求线程里读：ai-job 线程没有登录态，鉴权会变成匿名
		ProjectView project = support.readableProject(projectId);
		List<SurveySchema> questions = scorable(support.questions(project));
		if (questions.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"这份试卷里没有可计分的题目（单选 / 多选 / 判断 / 选择 / 填空 / 简答），无法体检");
		}
		boolean aiSummary = !Boolean.FALSE.equals(request.getAiSummary());
		String paperName = StringUtils.hasText(project.getName()) ? project.getName().trim() : "未命名试卷";
		log.info("AI 试卷质检任务: operator={}, projectId={}, questions={}, aiSummary={}", userId, projectId,
				Integer.valueOf(questions.size()), Boolean.valueOf(aiSummary));
		return aiJobService.submit(AiUsageService.SCENE_PAPER_CHECK, userId, context -> {
			context.progress(10);
			AiPaperCheckView view = inspect(questions, paperName, aiSummary, userId, context);
			context.result(view);
		});
	}

	/* ====== 任务体：确定性检查 → 模型补充建议 ====== */

	private AiPaperCheckView inspect(List<SurveySchema> questions, String paperName, boolean aiSummary, String userId,
			AiJobService.JobContext context) {
		List<Integer> noScore = new ArrayList<>();
		List<Integer> noAnswer = new ArrayList<>();
		List<Integer> emptyTitle = new ArrayList<>();
		Map<String, List<Integer>> titleGroups = new LinkedHashMap<>();
		Set<String> types = new LinkedHashSet<>();
		double totalScore = 0D;
		for (int index = 0; index < questions.size(); index++) {
			SurveySchema question = questions.get(index);
			int number = index + 1;
			if (question.getType() != null) {
				types.add(question.getType().name());
			}
			String plain = plainText(question.getTitle());
			if (!StringUtils.hasText(plain)) {
				emptyTitle.add(Integer.valueOf(number));
			}
			else {
				titleGroups.computeIfAbsent(plain, key -> new ArrayList<>()).add(Integer.valueOf(number));
			}
			Double score = question.getAttribute() == null ? null : question.getAttribute().getExamScore();
			if (score == null || score.doubleValue() <= 0D) {
				noScore.add(Integer.valueOf(number));
			}
			else {
				totalScore += score.doubleValue();
			}
			if (!hasCorrectAnswer(question)) {
				noAnswer.add(Integer.valueOf(number));
			}
		}
		context.progress(30);
		List<AiPaperCheckView.Issue> issues = new ArrayList<>();
		if (!noScore.isEmpty()) {
			issues.add(issue("no_score", SEVERITY_BLOCKER, idsOf(questions, noScore),
					"有 " + noScore.size() + " 道题没有设置分值：" + numbersText(noScore) + "，这些题交卷后永远拿不到分。",
					"在题目属性里补上分值，或按题型批量设置分值。"));
		}
		if (!noAnswer.isEmpty()) {
			issues.add(issue("no_answer", SEVERITY_BLOCKER, idsOf(questions, noAnswer),
					"有 " + noAnswer.size() + " 道题没有参考答案：" + numbersText(noAnswer) + "，交卷后无法自动判分。",
					"补上标准答案（选择题标在选项上，填空 / 简答写在参考答案里）。"));
		}
		if (!emptyTitle.isEmpty()) {
			issues.add(issue("format", SEVERITY_BLOCKER, idsOf(questions, emptyTitle),
					"有 " + emptyTitle.size() + " 道题的题干是空的：" + numbersText(emptyTitle) + "。",
					"补上题干，或把这几道题删掉。"));
		}
		List<Integer> duplicated = new ArrayList<>();
		List<String> duplicateGroups = new ArrayList<>();
		int duplicateGroupCount = 0;
		for (Map.Entry<String, List<Integer>> entry : titleGroups.entrySet()) {
			if (entry.getValue().size() < 2) {
				continue;
			}
			duplicateGroupCount++;
			duplicated.addAll(entry.getValue());
			if (duplicateGroups.size() < MAX_DUPLICATE_GROUPS) {
				duplicateGroups.add("「" + AiAssistSupport.oneLine(entry.getKey(), 20) + "」出现在 "
						+ numbersText(entry.getValue()));
			}
		}
		if (duplicateGroupCount > 0) {
			issues.add(issue("duplicate", SEVERITY_BLOCKER, idsOf(questions, duplicated),
					"有 " + duplicateGroupCount + " 组题干完全相同的题：" + String.join("；", duplicateGroups) + "。",
					"删掉重复题，或改掉其中一道的题干，避免同一道题重复计分。"));
		}
		if (totalScore <= 0D) {
			issues.add(issue("no_score", SEVERITY_BLOCKER, new ArrayList<>(),
					"整卷总分为 0 分，交卷后所有考生都是 0 分。", "先给每道题设置分值，再重新体检。"));
		}
		if (types.size() == 1 && questions.size() >= MIN_QUESTIONS_FOR_TYPE_MIX) {
			String only = label(types.iterator().next());
			issues.add(issue("type_mix", SEVERITY_WARNING, new ArrayList<>(),
					"整卷只有一种题型（" + only + "），考生容易疲劳，区分度也低。",
					"至少再配一种题型，例如单选配判断、或多选配填空。"));
		}
		// blocker 排在前面（老师先修会出事故的，再看质量建议）；sorted 是稳定排序，同类问题的顺序不变
		issues.sort(Comparator.comparingInt(
				(AiPaperCheckView.Issue item) -> SEVERITY_BLOCKER.equals(item.getSeverity()) ? 0 : 1));
		int blockers = count(issues, SEVERITY_BLOCKER);
		int warnings = count(issues, SEVERITY_WARNING);
		int score = Math.max(0, 100 - blockers * BLOCKER_PENALTY - warnings * WARNING_PENALTY);

		String advice = null;
		if (aiSummary) {
			context.progress(50);
			try {
				ModelResult model = ask(questions, paperName, totalScore, issues, userId);
				if (model != null) {
					if (model.score() != null) {
						// 模型分只能压低、不能抬高：真的缺 3 道题答案时，模型说「挺好」也不算数
						score = Math.min(score, model.score().intValue());
					}
					advice = model.advice();
					issues.addAll(model.issues());
				}
			}
			catch (RuntimeException e) {
				// 模型挂了不能把确定性结论一起丢掉：老师要的是「哪里有问题」，不是「AI 不可用」
				log.warn("试卷质检：模型补充建议失败，已按确定性结果返回 paper={}, {}", paperName,
						AiAssistSupport.messageOf(e));
			}
		}
		context.progress(90);
		AiPaperCheckView view = new AiPaperCheckView();
		view.setScore(Integer.valueOf(Math.max(0, Math.min(100, score))));
		view.setSummary(summary(questions.size(), totalScore, blockers, warnings));
		view.setAdvice(advice);
		view.setIssues(issues);
		log.info("试卷质检完成: paper={}, questions={}, score={}, blockers={}, warnings={}, modelAdvice={}", paperName,
				Integer.valueOf(questions.size()), view.getScore(), Integer.valueOf(blockers), Integer.valueOf(warnings),
				Boolean.valueOf(StringUtils.hasText(advice)));
		return view;
	}

	/** 调一次模型要「整体评价 + 建议」；解析失败会抛异常，由调用方兜底 */
	private ModelResult ask(List<SurveySchema> questions, String paperName, double totalScore,
			List<AiPaperCheckView.Issue> findings, String userId) {
		LinkedHashMap<String, String> vars = new LinkedHashMap<>();
		vars.put("paper", paperName);
		vars.put("questionCount", String.valueOf(questions.size()));
		vars.put("totalScore", AiAssistSupport.formatScore(totalScore));
		vars.put("typePlan", typePlan(questions));
		vars.put("findings", findingsText(findings));
		vars.put("questions", questionLines(questions));
		AiRequest request = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_CHECK, vars))
				.userPrompt("请按上面的要求给出质检结论，只输出 JSON。")
				// 质检要的是一致结论，不需要文采：温度压低，同一份卷子两次体检的说法才接近
				.temperature(Double.valueOf(0.3D))
				// 后台任务：跳过「每分钟 N 次」的窗口限流
				.background(true).build();
		AiCompletion completion = support.call(AiUsageService.SCENE_PAPER_CHECK, userId, request, true);
		return parse(completion == null ? null : completion.getText(), questions);
	}

	/**
	 * 解析模型结果：分数夹到 0~100、题号只认卷子里真实存在的 id、kind 只认三种。
	 *
	 * <p>模型的脏数据在这里就地修掉，不让它把整单打成 500：分数为空就只用系统分，
	 * 题号编的就丢掉，kind 认不出就归到 coverage。
	 */
	private ModelResult parse(String json, List<SurveySchema> questions) {
		JsonNode root = support.readJson(json, "试卷质检");
		if (root == null || root.isMissingNode()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "试卷质检结果解析失败：模型返回了空内容");
		}
		Set<String> knownIds = new HashSet<>();
		for (SurveySchema question : questions) {
			if (StringUtils.hasText(question.getId())) {
				knownIds.add(question.getId());
			}
		}
		Integer score = null;
		JsonNode rawScore = root.path("score");
		if (rawScore.isNumber()) {
			score = Integer.valueOf(Math.max(0, Math.min(100, rawScore.asInt(0))));
		}
		List<AiPaperCheckView.Issue> issues = new ArrayList<>();
		JsonNode array = root.path("issues");
		if (array.isArray()) {
			for (JsonNode node : array) {
				if (issues.size() >= MAX_MODEL_ISSUES) {
					break;
				}
				String message = text(node, "message");
				if (!StringUtils.hasText(message)) {
					continue;
				}
				AiPaperCheckView.Issue item = new AiPaperCheckView.Issue();
				item.setKind(modelKind(text(node, "kind")));
				// 模型给的问题只当质量建议：硬伤由确定性规则负责，不能被模型「降级」成 warning
				item.setSeverity(SEVERITY_WARNING);
				item.setMessage(message);
				item.setSuggestion(text(node, "suggestion"));
				item.setQuestionIds(knownIdsOf(node.path("questionIds"), knownIds));
				issues.add(item);
			}
		}
		return new ModelResult(score, combineAdvice(text(root, "summary"), text(root, "advice")), issues);
	}

	/* ====== 提示词素材 ====== */

	private static String typePlan(List<SurveySchema> questions) {
		Map<String, Integer> counts = new LinkedHashMap<>();
		Map<String, Double> scores = new LinkedHashMap<>();
		for (SurveySchema question : questions) {
			String type = question.getType() == null ? "Unknown" : question.getType().name();
			counts.merge(type, Integer.valueOf(1), (left, right) -> Integer.valueOf(left.intValue() + right.intValue()));
			double score = question.getAttribute() == null || question.getAttribute().getExamScore() == null ? 0D
					: question.getAttribute().getExamScore().doubleValue();
			scores.merge(type, Double.valueOf(score),
					(left, right) -> Double.valueOf(left.doubleValue() + right.doubleValue()));
		}
		StringBuilder text = new StringBuilder();
		for (Map.Entry<String, Integer> entry : counts.entrySet()) {
			if (text.length() > 0) {
				text.append('、');
			}
			text.append(label(entry.getKey())).append(' ').append(entry.getValue().intValue()).append(" 题（")
					.append(AiAssistSupport.formatScore(scores.getOrDefault(entry.getKey(), Double.valueOf(0D)).doubleValue()))
					.append(" 分）");
		}
		return text.toString();
	}

	/** 把确定性结论压成一句提示词素材：让模型别重复报「缺分值」这种系统已经报过的 */
	private static String findingsText(List<AiPaperCheckView.Issue> issues) {
		if (CollectionUtils.isEmpty(issues)) {
			return "未发现缺分值 / 缺答案 / 重复题 / 题型单一这类硬性问题";
		}
		StringBuilder text = new StringBuilder();
		for (AiPaperCheckView.Issue issue : issues) {
			if (text.length() > 0) {
				text.append('；');
			}
			text.append(issue.getMessage());
		}
		return text.toString();
	}

	/** 一行一道题：题号|题型|分值|难度|题干摘要 */
	private static String questionLines(List<SurveySchema> questions) {
		StringBuilder text = new StringBuilder();
		int shown = Math.min(questions.size(), MAX_PROMPT_QUESTIONS);
		for (int index = 0; index < shown; index++) {
			SurveySchema question = questions.get(index);
			String score = question.getAttribute() == null || question.getAttribute().getExamScore() == null ? "无"
					: AiAssistSupport.formatScore(question.getAttribute().getExamScore().doubleValue());
			text.append(index + 1).append('|').append(label(question.getType() == null ? null : question.getType().name()))
					.append('|').append(score).append('|')
					.append(StringUtils.hasText(question.getDifficulty()) ? question.getDifficulty().trim() : "未标注")
					.append('|').append(AiAssistSupport.plainTitle(question.getTitle(), MAX_SUMMARY_CHARS)).append('\n');
		}
		if (questions.size() > shown) {
			text.append("（其余 ").append(questions.size() - shown).append(" 题略）\n");
		}
		return text.toString();
	}

	private static String summary(int questionCount, double totalScore, int blockers, int warnings) {
		StringBuilder text = new StringBuilder("共 ");
		text.append(questionCount).append(" 题、总分 ").append(AiAssistSupport.formatScore(totalScore)).append(" 分：");
		if (blockers <= 0 && warnings <= 0) {
			return text.append("没发现缺分值 / 缺答案 / 重复题这类硬性问题，可以直接开考。").toString();
		}
		text.append("发现 ").append(blockers).append(" 处必须修的问题");
		if (warnings > 0) {
			text.append("、").append(warnings).append(" 条质量建议");
		}
		return text.append("，见下方清单。").toString();
	}

	/* ====== 判定 ====== */

	/**
	 * 有没有参考答案——按题型分两种口径，错一种就是误报：
	 * <ul>
	 * <li><b>选择题</b>（单选 / 多选 / 判断 / 下拉）只认<b>选项上</b>的标记：判分器
	 * {@code AnswerScoreEvaluator} 读的是 {@code child.attribute.examCorrectAnswer}，题目自身写的答案
	 * 判分时根本不用（{@code AiContentGuard#checkAnswers} 也是这个口径）；</li>
	 * <li><b>填空 / 简答</b>认题目自身的 {@code attribute.examCorrectAnswer}，也认子题上的
	 * （多空填空一空一个答案）。</li>
	 * </ul>
	 */
	private static boolean hasCorrectAnswer(SurveySchema question) {
		if (CHOICE_TYPES.contains(question.getType())) {
			if (CollectionUtils.isEmpty(question.getChildren())) {
				return false;
			}
			for (SurveySchema child : question.getChildren()) {
				if (child != null && child.getAttribute() != null
						&& StringUtils.hasText(child.getAttribute().getExamCorrectAnswer())) {
					return true;
				}
			}
			return false;
		}
		return StringUtils.hasText(correctAnswerOf(question));
	}

	/** 题目自身或子题上的参考答案文本（填空 / 简答用；选择题的答案在选项上，见 {@link #hasCorrectAnswer}） */
	private static String correctAnswerOf(SurveySchema question) {
		if (question.getAttribute() != null && StringUtils.hasText(question.getAttribute().getExamCorrectAnswer())) {
			return question.getAttribute().getExamCorrectAnswer().trim();
		}
		if (CollectionUtils.isEmpty(question.getChildren())) {
			return null;
		}
		List<String> answers = new ArrayList<>();
		for (SurveySchema child : question.getChildren()) {
			if (child != null && child.getAttribute() != null
					&& StringUtils.hasText(child.getAttribute().getExamCorrectAnswer())) {
				answers.add(child.getAttribute().getExamCorrectAnswer().trim());
			}
		}
		return answers.isEmpty() ? null : String.join(" / ", answers);
	}

	/** 只留参与计分的题：见 {@link #SCORED_TYPES} 的注释 */
	private static List<SurveySchema> scorable(List<SurveySchema> questions) {
		List<SurveySchema> result = new ArrayList<>();
		if (CollectionUtils.isEmpty(questions)) {
			return result;
		}
		for (SurveySchema question : questions) {
			if (question != null && question.getType() != null && SCORED_TYPES.contains(question.getType())) {
				result.add(question);
			}
		}
		return result;
	}

	/** 题干去标签并压空白：判空与判重都用这一份，避免「&lt;p&gt; &lt;/p&gt;」被当成有内容 */
	private static String plainText(String title) {
		if (!StringUtils.hasText(title)) {
			return "";
		}
		return SchemaHelper.trimHtmlTag(title).replaceAll("\\s+", " ").trim();
	}

	/* ====== 模型结果的容错 ====== */

	/** 模型给的 kind 只允许 coverage / difficulty / format，其余归到 coverage（最接近「整体质量」） */
	private static String modelKind(String kind) {
		if ("coverage".equals(kind) || "difficulty".equals(kind) || "format".equals(kind)) {
			return kind;
		}
		return "coverage";
	}

	private static List<String> knownIdsOf(JsonNode array, Set<String> knownIds) {
		List<String> ids = new ArrayList<>();
		if (array == null || !array.isArray()) {
			return ids;
		}
		for (JsonNode node : array) {
			String id = node.asText("").trim();
			if (StringUtils.hasText(id) && knownIds.contains(id) && !ids.contains(id)) {
				ids.add(id);
			}
			if (ids.size() >= MAX_ISSUE_IDS) {
				break;
			}
		}
		return ids;
	}

	/** 模型的总评与建议合成一段：前端只有 advice 一个字段，两句话分开存不如合起来读得顺 */
	private static String combineAdvice(String summary, String advice) {
		StringBuilder text = new StringBuilder();
		if (StringUtils.hasText(summary)) {
			text.append("总评：").append(summary.trim());
		}
		if (StringUtils.hasText(advice)) {
			if (text.length() > 0) {
				text.append("；");
			}
			text.append("建议：").append(advice.trim());
		}
		return text.length() == 0 ? null : text.toString();
	}

	/** 读一个文本字段：去换行、截断；空值返回 null（前端「没有就是没有」比空串好判断） */
	private static String text(JsonNode node, String field) {
		if (node == null) {
			return null;
		}
		JsonNode value = node.path(field);
		if (value.isMissingNode() || value.isNull()) {
			return null;
		}
		String raw = value.asText(null);
		return StringUtils.hasText(raw) ? AiAssistSupport.oneLine(raw, MAX_TEXT_CHARS) : null;
	}

	/* ====== 小工具 ====== */

	private static AiPaperCheckView.Issue issue(String kind, String severity, List<String> questionIds, String message,
			String suggestion) {
		AiPaperCheckView.Issue issue = new AiPaperCheckView.Issue();
		issue.setKind(kind);
		issue.setSeverity(severity);
		issue.setQuestionIds(questionIds);
		issue.setMessage(message);
		issue.setSuggestion(suggestion);
		return issue;
	}

	/** 第 N 题对应的题目 id（题号从 1 开始；没有 id 的题跳过——前端按 id 跳转，空 id 会跳错地方） */
	private static List<String> idsOf(List<SurveySchema> questions, List<Integer> numbers) {
		List<String> ids = new ArrayList<>();
		for (Integer number : numbers) {
			int index = number.intValue() - 1;
			if (index < 0 || index >= questions.size()) {
				continue;
			}
			SurveySchema question = questions.get(index);
			if (question != null && StringUtils.hasText(question.getId())) {
				ids.add(question.getId());
			}
			if (ids.size() >= MAX_ISSUE_IDS) {
				break;
			}
		}
		return ids;
	}

	/** 题号列表压成「第 2、5、9 题」；超过 {@link #MAX_LISTED} 个就写「等 N 题」 */
	private static String numbersText(List<Integer> numbers) {
		StringBuilder text = new StringBuilder("第 ");
		int shown = Math.min(numbers.size(), MAX_LISTED);
		for (int index = 0; index < shown; index++) {
			if (index > 0) {
				text.append('、');
			}
			text.append(numbers.get(index).intValue());
		}
		if (numbers.size() > shown) {
			return text.append(" 等 ").append(numbers.size()).append(" 题").toString();
		}
		return text.append(" 题").toString();
	}

	private static int count(List<AiPaperCheckView.Issue> issues, String severity) {
		int count = 0;
		for (AiPaperCheckView.Issue issue : issues) {
			if (severity.equals(issue.getSeverity())) {
				count++;
			}
		}
		return count;
	}

	private static String label(String type) {
		if (!StringUtils.hasText(type)) {
			return "未知题型";
		}
		return TYPE_LABELS.getOrDefault(type, type);
	}

	/** 模型给的整体评价：三个字段都可能为空，缺哪个就用系统结论补哪个 */
	private record ModelResult(Integer score, String advice, List<AiPaperCheckView.Issue> issues) {
	}

}
