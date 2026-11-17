package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiContentGuard;
import cn.surveyking.server.ai.core.AiGateway;
import cn.surveyking.server.ai.core.AiJobService;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.ai.core.PromptRegistry;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiGradeSuggestRequest;
import cn.surveyking.server.domain.dto.AiGradeSuggestView;
import cn.surveyking.server.domain.dto.AiPaperApplyRequest;
import cn.surveyking.server.domain.dto.AiPaperApplyView;
import cn.surveyking.server.domain.dto.AiQuestionRewriteRequest;
import cn.surveyking.server.domain.dto.AiQuestionRewriteView;
import cn.surveyking.server.domain.dto.AiReportSummaryRequest;
import cn.surveyking.server.domain.dto.AiReportSummaryView;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.ReportData;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.AiUsage;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.service.AiAssistService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 四个 AI 场景的实现：把「参数 / 业务数据」拼成提示词，交给 {@link AiGateway}，
 * 拿回结果后<b>先校验、再交给调用方</b>。
 *
 * <p>三条贯穿全类的口径：
 * <ol>
 * <li><b>模型只负责产出内容，结构由后端补齐</b>：改题/批改/学情只拿文本与结构化建议，
 * 写库（采纳、落分）全部走既有业务服务，判分口径只有一份；</li>
 * <li><b>记账就地发生</b>：每次调模型都写一条 {@code t_ai_usage}（ok / error / rejected），
 * 失败也要记——排障时最想知道的恰恰是「哪次失败了、为什么」；</li>
 * <li><b>后台线程里没有登录态</b>：userId 在提交任务时抓一次传进去，
 * 绝不在 {@code ai-job} 线程里读 {@code SecurityContextHolder}。</li>
 * </ol>
 *
 * @author p4-backend
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiAssistServiceImpl implements AiAssistService {

	/** 项目授权级别：1 只读（{@code ProjectPartnerService#accessLevel} 的口径） */
	private static final int ACCESS_LEVEL_VIEW = 1;

	/** 学员答案最多带多少字进提示词：再长既贵也没用，判分看要点不看长度 */
	private static final int MAX_ANSWER_CHARS = 2000;

	/** 学情总结里最多带多少道题的统计，避免提示词过长 */
	private static final int MAX_REPORT_QUESTIONS = 40;

	/** 学情总结里最多带几天的每日答卷数 */
	private static final int MAX_REPORT_DAYS = 14;

	/** 各个场景的提示词模板 id（文件名，不含 .md） */
	private static final String PROMPT_PAPER = "paper-generate";

	private static final String PROMPT_REWRITE = "question-rewrite";

	private static final String PROMPT_GRADE = "grade-suggest";

	private static final String PROMPT_REPORT = "report-summary";

	/** 改写风格 → 给模型的一句指令 */
	private static final Map<String, String> REWRITE_STYLES = new LinkedHashMap<>();

	static {
		REWRITE_STYLES.put("clear", "更清楚：把口语化、含糊的表述改成考试用语，让考生一眼看懂在问什么。");
		REWRITE_STYLES.put("neutral", "更中性：去掉带倾向性的措辞，避免题干暗示答案。");
		REWRITE_STYLES.put("shorter", "更短：在保留关键信息的前提下压缩到 60 字以内。");
	}

	private final AiGateway aiGateway;

	private final PromptRegistry promptRegistry;

	private final AiJobService aiJobService;

	private final AiUsageService aiUsageService;

	private final ObjectMapper objectMapper;

	private final ProjectService projectService;

	private final ProjectPartnerService projectPartnerService;

	private final ReportService reportService;

	private final AnswerMapper answerMapper;

	private final AnswerAccessGuard answerAccessGuard;

	@Override
	public Map<String, Object> describeJob(String jobId) {
		return aiJobService.describe(jobId);
	}

	@Override
	public AiPaperApplyView applyPaper(AiPaperApplyRequest request) {
		if (request == null || !StringUtils.hasText(request.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要写入的项目");
		}
		if (CollectionUtils.isEmpty(request.getQuestions())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "没有要采纳的题目");
		}
		ProjectView project = projectService.getProject(request.getProjectId());
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound, "项目不存在");
		}
		// 采纳的题也要能判分：这道闸门与出卷时用的是同一份规则
		AiContentGuard.checkAccepted(request.getQuestions());
		SurveySchema schema = project.getSurvey() == null ? emptySchema(project) : project.getSurvey();
		List<SurveySchema> children = schema.getChildren() == null ? new ArrayList<>()
				: new ArrayList<>(schema.getChildren());
		Set<String> usedIds = new HashSet<>();
		for (SurveySchema existing : SchemaHelper.flatSurveySchemaWitchOption(schema, true)) {
			if (StringUtils.hasText(existing.getId())) {
				usedIds.add(existing.getId());
			}
		}
		int added = 0;
		for (SurveySchema question : request.getQuestions()) {
			if (question == null) {
				continue;
			}
			// id 撞了就换一个：生成结果可能被采纳两次，撞 id 会让判分把两道题算成一题
			if (!StringUtils.hasText(question.getId()) || !usedIds.add(question.getId())) {
				question.setId(newId());
				usedIds.add(question.getId());
			}
			children.add(question);
			added++;
		}
		schema.setChildren(children);
		ProjectRequest update = new ProjectRequest();
		update.setId(project.getId());
		update.setSurvey(schema);
		// 走 ProjectService 而不是直接改库：富文本消毒、附件引用登记、project:update 的行级闸门都在那里
		projectService.updateProject(update);
		AiPaperApplyView view = new AiPaperApplyView();
		view.setProjectId(project.getId());
		view.setAdded(Integer.valueOf(added));
		view.setTotal(Integer.valueOf(SchemaHelper.flatSurveySchema(schema).size()));
		log.info("AI 题目已写入项目: projectId={}, added={}, total={}, operator={}", project.getId(), added,
				view.getTotal(), SecurityContextUtils.getUserId());
		return view;
	}

	/* ====== ② AI 改题 ====== */

	@Override
	public AiQuestionRewriteView rewriteQuestion(AiQuestionRewriteRequest request) {
		if (request == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "改题参数不能为空");
		}
		String title = request.getTitle();
		String type = request.getType();
		if (StringUtils.hasText(request.getProjectId())) {
			// 即使题干是前端直传的，也不该允许「用别人的 projectId 白嫖一次 AI」→ 统一过项目只读闸门
			assertCanRead(request.getProjectId());
		}
		if (!StringUtils.hasText(title)) {
			if (!StringUtils.hasText(request.getProjectId()) || !StringUtils.hasText(request.getQuestionId())) {
				throw new ErrorCodeException(ErrorCode.ValidationError, "请提供题目 id（questionId）或直接传题干（title）");
			}
			SurveySchema question = findQuestion(loadSchema(request.getProjectId()), request.getQuestionId());
			if (question == null) {
				throw new ErrorCodeException(ErrorCode.ValidationError, "题目不存在，请先保存试卷");
			}
			title = question.getTitle();
			if (!StringUtils.hasText(type) && question.getType() != null) {
				type = question.getType().name();
			}
		}
		// 富文本题干先剥标签：发给模型的是纯文本，返回的也是纯文本，写回时不会破坏原有 HTML
		String plainTitle = SchemaHelper.trimHtmlTag(title);
		if (!StringUtils.hasText(plainTitle)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题干为空，无法改写");
		}
		String style = StringUtils.hasText(request.getStyle()) ? request.getStyle().trim().toLowerCase() : "clear";
		LinkedHashMap<String, String> vars = new LinkedHashMap<>();
		vars.put("style", REWRITE_STYLES.getOrDefault(style, REWRITE_STYLES.get("clear")));
		vars.put("type", StringUtils.hasText(type) ? type : "未标注");
		vars.put("title", plainTitle);
		AiCompletion completion = call(AiUsageService.SCENE_QUESTION_REWRITE, SecurityContextUtils.getUserId(),
				AiRequest.builder().systemPrompt(promptRegistry.render(PROMPT_REWRITE, vars))
						.userPrompt("请按上面的要求给出 3 条改写建议，只输出 JSON。").temperature(Double.valueOf(0.7D))
						.build(),
				true);
		return parseSuggestions(completion.getText());
	}

	/* ====== ③ AI 批改建议 ====== */

	@Override
	public AiGradeSuggestView suggestGrade(AiGradeSuggestRequest request) {
		if (request == null || !StringUtils.hasText(request.getAnswerId())
				|| !StringUtils.hasText(request.getQuestionId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请提供答卷 id 与题目 id");
		}
		Answer answer = answerMapper.selectById(request.getAnswerId());
		if (answer == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "答卷不存在或已删除");
		}
		// 行级权限：只有本人、项目所有者/协作者、管理员能看这份答卷
		answerAccessGuard.assertProjectAccess(answer.getProjectId());
		SurveySchema schema = answer.getSurvey() != null ? answer.getSurvey() : loadSchema(answer.getProjectId());
		SurveySchema question = findQuestion(schema, request.getQuestionId());
		if (question == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "答卷里没有这道题");
		}
		if (!AnswerScoreEvaluator.isManual(question)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "该题不是主观题，客观题由系统判分，不需要 AI 建议");
		}
		Double maxScore = question.getAttribute() == null ? null : question.getAttribute().getExamScore();
		if (maxScore == null || maxScore <= 0) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "该题没有配置分值，无法给出建议分");
		}
		String reference = correctAnswerOf(question);
		if (!StringUtils.hasText(reference)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "该题没有参考答案，无法判断采分点");
		}
		String studentAnswer = truncate(stringifyAnswer(answer.getAnswer() == null ? null
				: answer.getAnswer().get(request.getQuestionId())), MAX_ANSWER_CHARS);
		LinkedHashMap<String, String> vars = new LinkedHashMap<>();
		vars.put("title", SchemaHelper.trimHtmlTag(question.getTitle()));
		vars.put("maxScore", formatScore(maxScore.doubleValue()));
		vars.put("reference", reference);
		vars.put("answer", StringUtils.hasText(studentAnswer) ? studentAnswer : "（学员未作答）");
		AiCompletion completion = call(AiUsageService.SCENE_GRADE_SUGGEST, SecurityContextUtils.getUserId(),
				AiRequest.builder().systemPrompt(promptRegistry.render(PROMPT_GRADE, vars))
						.userPrompt("请给出建议分、置信度、采分点命中情况与理由，只输出 JSON。")
						.temperature(Double.valueOf(0.2D)).build(),
				true);
		return parseGradeSuggestion(completion.getText(), maxScore.doubleValue());
	}

	/* ====== ④ AI 学情 ====== */

	@Override
	public AiReportSummaryView summarizeReport(AiReportSummaryRequest request) {
		if (request == null || !StringUtils.hasText(request.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择项目");
		}
		ProjectView project = projectService.getProject(request.getProjectId());
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound, "项目不存在");
		}
		// 只吃报表统计数字，不把学员原始答卷发给模型
		ReportData data = reportService.getData(request.getProjectId(), true, request.getClassId());
		if (data == null || data.getTotal() == null || data.getTotal().intValue() <= 0) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "该项目还没有答卷，无法生成学情分析");
		}
		LinkedHashMap<String, String> vars = new LinkedHashMap<>();
		vars.put("statistics", buildStatisticsText(project, data));
		AiCompletion completion = call(AiUsageService.SCENE_REPORT_SUMMARY, SecurityContextUtils.getUserId(),
				AiRequest.builder().systemPrompt(promptRegistry.render(PROMPT_REPORT, vars))
						.userPrompt("请根据上面的统计数字写一段学情分析。").temperature(Double.valueOf(0.5D)).build(),
				false);
		AiReportSummaryView view = new AiReportSummaryView();
		view.setText(completion.getText() == null ? null : completion.getText().trim());
		return view;
	}

	/* ====== 解析其它三种场景的结果 ====== */

	private AiQuestionRewriteView parseSuggestions(String json) {
		JsonNode root = readJsonTree(json, "AI 改题");
		JsonNode array = root.isArray() ? root : root.path("suggestions");
		List<AiQuestionRewriteView.Suggestion> suggestions = new ArrayList<>();
		if (array.isArray()) {
			for (JsonNode node : array) {
				String text = asText(node, "text");
				if (!StringUtils.hasText(text)) {
					continue;
				}
				AiQuestionRewriteView.Suggestion suggestion = new AiQuestionRewriteView.Suggestion();
				suggestion.setText(text);
				suggestion.setReason(asText(node, "reason"));
				suggestions.add(suggestion);
				if (suggestions.size() >= 3) {
					break;
				}
			}
		}
		if (suggestions.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 没有给出可用的改写建议，请重试");
		}
		AiQuestionRewriteView view = new AiQuestionRewriteView();
		view.setSuggestions(suggestions);
		return view;
	}

	private AiGradeSuggestView parseGradeSuggestion(String json, double maxScore) {
		JsonNode root = readJsonTree(json, "AI 批改建议");
		AiGradeSuggestView view = new AiGradeSuggestView();
		double score = clamp(root.path("score").asDouble(0D), 0D, maxScore);
		view.setScore(Double.valueOf(Math.round(score * 10D) / 10D));
		view.setConfidence(Double.valueOf(Math.round(clamp(root.path("confidence").asDouble(0.5D), 0D, 1D) * 100D) / 100D));
		view.setReason(asText(root, "reason"));
		List<AiGradeSuggestView.Point> points = new ArrayList<>();
		JsonNode array = root.path("points");
		if (array.isArray()) {
			for (JsonNode node : array) {
				AiGradeSuggestView.Point point = new AiGradeSuggestView.Point();
				point.setPoint(asText(node, "point"));
				point.setHit(Boolean.valueOf(node.path("hit").asBoolean(false)));
				points.add(point);
			}
		}
		view.setPoints(points);
		return view;
	}

	private JsonNode readJsonTree(String json, String scene) {
		try {
			JsonNode root = objectMapper.readTree(json);
			if (root == null) {
				throw new IllegalStateException("空响应");
			}
			return root;
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					scene + "结果解析失败：" + messageOf(e) + "，请重试");
		}
	}

	/* ====== 学情统计文本 ====== */

	/**
	 * 把 {@link ReportData} 压成一段给模型看的统计文本。
	 *
	 * <p>只包含「题号 / 题干 / 作答数 / 合计分 / 平均分 / 最低 / 最高」与每日答卷数，
	 * <b>不含任何学员答案原文、姓名、账号</b>。
	 */
	private String buildStatisticsText(ProjectView project, ReportData data) {
		StringBuilder text = new StringBuilder();
		text.append("项目：").append(StringUtils.hasText(project.getName()) ? project.getName() : "未命名").append('\n');
		text.append("答卷总数：").append(data.getTotal() == null ? 0 : data.getTotal().intValue()).append('\n');
		Map<String, Integer> daily = data.getDailyCountStat();
		if (daily != null && !daily.isEmpty()) {
			List<Map.Entry<String, Integer>> entries = new ArrayList<>(daily.entrySet());
			int from = Math.max(0, entries.size() - MAX_REPORT_DAYS);
			text.append("每日答卷数：");
			for (int index = from; index < entries.size(); index++) {
				Map.Entry<String, Integer> entry = entries.get(index);
				if (index > from) {
					text.append("、");
				}
				text.append(entry.getKey()).append(" ").append(entry.getValue()).append(" 份");
			}
			text.append('\n');
		}
		text.append("逐题统计（题干 | 作答数 | 合计分 | 平均分 | 最低 | 最高）：\n");
		List<SurveySchema> questions = project.getSurvey() == null ? List.of()
				: SchemaHelper.flatSurveySchema(project.getSurvey());
		Map<String, ReportData.Data> statistics = data.getStatistics() == null ? Map.of() : data.getStatistics();
		int number = 0;
		for (SurveySchema question : questions) {
			ReportData.Data stat = statistics.get(question.getId());
			if (stat == null) {
				continue;
			}
			number++;
			text.append(number).append(". ").append(question.getTitle()).append(" | 作答 ").append(stat.getTotal())
					.append(" | 合计分 ").append(formatNumber(stat.getSum())).append(" | 平均 ")
					.append(formatNumber(stat.getAverage())).append(" | 最低 ").append(formatNumber(stat.getMin()))
					.append(" | 最高 ").append(formatNumber(stat.getMax())).append('\n');
			if (number >= MAX_REPORT_QUESTIONS) {
				text.append("（其余题目略）\n");
				break;
			}
		}
		return text.toString();
	}

	/* ====== 记账 / 通用工具 ====== */

	/** 调模型并记账：成功记 ok，被拦记 rejected，其它异常记 error；记账之后原样抛出 */
	private AiCompletion call(String scene, String userId, AiRequest request, boolean json) {
		long start = System.currentTimeMillis();
		try {
			// 限额闸门：超限直接 400，一次模型都不调（被拦也要记账，否则「今天怎么没额度」查不出来）
			aiUsageService.assertQuota(userId);
		}
		catch (ErrorCodeException e) {
			recordUsage(userId, scene, null, AiUsage.STATUS_REJECTED, System.currentTimeMillis() - start,
					e.getMessage());
			throw e;
		}
		try {
			AiCompletion completion = json ? aiGateway.completeJson(request) : aiGateway.complete(request);
			recordUsage(userId, scene, completion, AiUsage.STATUS_OK, completion.getCostMs(), null);
			return completion;
		}
		catch (ErrorCodeException e) {
			recordUsage(userId, scene, null, AiUsage.STATUS_REJECTED, System.currentTimeMillis() - start,
					e.getMessage());
			throw e;
		}
		catch (RuntimeException e) {
			recordUsage(userId, scene, null, AiUsage.STATUS_ERROR, System.currentTimeMillis() - start,
					messageOf(e));
			throw e;
		}
	}

	/** 一次模型调用对应的用量（拿到 completion 就按真实 token 记，拿不到就记 0） */
	private void recordUsage(String userId, String scene, AiCompletion completion, String status, long costMs,
			String error) {
		if (completion == null) {
			aiUsageService.record(userId, scene, null, 0, 0, costMs, status, error);
			return;
		}
		aiUsageService.record(userId, scene, completion.getModel(), completion.getPromptTokens(),
				completion.getCompletionTokens(), costMs, status, error);
	}

	private SurveySchema loadSchema(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择项目");
		}
		ProjectView project = projectService.getProject(projectId);
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound, "项目不存在");
		}
		assertCanRead(projectId);
		return project.getSurvey();
	}

	/** 项目只读闸门：管理员、所有者、任意级别协作者都能过（0 表示完全没有授权） */
	private void assertCanRead(String projectId) {
		if (projectPartnerService.accessLevel(projectId) < ACCESS_LEVEL_VIEW) {
			throw new AccessDeniedException("没有权限访问该项目");
		}
	}

	/** 在项目 schema 里按 id 找题（扁平化后再找，章节里的题也能找到） */
	private SurveySchema findQuestion(SurveySchema schema, String questionId) {
		if (schema == null || !StringUtils.hasText(questionId)) {
			return null;
		}
		for (SurveySchema question : SchemaHelper.flatSurveySchema(schema)) {
			if (questionId.equals(question.getId())) {
				return question;
			}
		}
		return null;
	}

	/** 标准答案：先看题目自身的 examCorrectAnswer，再看子题（简答题的参考答案挂在子题上） */
	private String correctAnswerOf(SurveySchema question) {
		if (question.getAttribute() != null && StringUtils.hasText(question.getAttribute().getExamCorrectAnswer())) {
			return question.getAttribute().getExamCorrectAnswer();
		}
		if (question.getChildren() == null) {
			return null;
		}
		List<String> answers = question.getChildren().stream().filter(Objects::nonNull)
				.filter(child -> child.getAttribute() != null
						&& StringUtils.hasText(child.getAttribute().getExamCorrectAnswer()))
				.map(child -> child.getAttribute().getExamCorrectAnswer()).collect(Collectors.toList());
		return answers.isEmpty() ? null : String.join(" / ", answers);
	}

	/** 学员答案转文本：简答题是字符串，多空填空是「空 id → 值」的 Map */
	private static String stringifyAnswer(Object value) {
		if (value == null) {
			return null;
		}
		if (value instanceof Map<?, ?> map) {
			return map.values().stream().filter(Objects::nonNull).map(String::valueOf)
					.collect(Collectors.joining("；"));
		}
		if (value instanceof Collection<?> collection) {
			return collection.stream().filter(Objects::nonNull).map(String::valueOf).collect(Collectors.joining("；"));
		}
		return String.valueOf(value);
	}

	private SurveySchema emptySchema(ProjectView project) {
		SurveySchema root = new SurveySchema();
		root.setId(project.getId());
		root.setTitle(project.getName());
		root.setType(SurveySchema.QuestionType.Survey);
		root.setAttribute(new SurveySchema.Attribute());
		root.setChildren(new ArrayList<>());
		return root;
	}

	private static String asText(JsonNode node, String field) {
		if (node == null) {
			return null;
		}
		JsonNode value = node.path(field);
		if (value.isMissingNode() || value.isNull()) {
			return null;
		}
		String text = value.asText(null);
		return StringUtils.hasText(text) ? text.trim() : null;
	}

	private static String messageOf(Throwable e) {
		if (e == null) {
			return null;
		}
		return StringUtils.hasText(e.getMessage()) ? e.getMessage() : e.getClass().getSimpleName();
	}

	private static String truncate(String text, int max) {
		if (!StringUtils.hasText(text)) {
			return null;
		}
		String value = text.trim();
		return value.length() <= max ? value : value.substring(0, max) + "…";
	}

	private static double clamp(double value, double min, double max) {
		return Math.max(min, Math.min(max, value));
	}

	private static String formatScore(double value) {
		return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(Math.round(value * 100D) / 100D);
	}

	private static String formatNumber(Number value) {
		if (value == null) {
			return "-";
		}
		double number = value.doubleValue();
		return number == Math.rint(number) ? String.valueOf((long) number) : String.valueOf(Math.round(number * 100D) / 100D);
	}

	private static String newId() {
		return UUID.randomUUID().toString().replace("-", "");
	}

}
