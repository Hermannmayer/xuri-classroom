package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiJobService;
import cn.surveyking.server.ai.core.AiPaperSpec;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiPracticeRecommendRequest;
import cn.surveyking.server.domain.dto.AiPracticeRecommendView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.ReportData;
import cn.surveyking.server.domain.dto.RepoView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateQuery;
import cn.surveyking.server.domain.dto.TemplateView;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.service.AiPracticeRecommendService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.RepoService;
import cn.surveyking.server.service.ReportService;
import cn.surveyking.server.service.TemplateService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * 错题重练推荐：按一场考试（可限定班级）的得分率找薄弱考点，再从题库里挑一组同类题。
 *
 * <p>整条链路只回答一个问题——「这场考试哪些考点没掌握，下一组练习该练什么」。
 * 为此有四个取舍：
 * <ol>
 * <li><b>异步</b>：模型要在上百道候选题里挑 20 道，30~90 秒是常态，同步接口在弱网下会被浏览器当超时。
 * 任务走 {@link AiJobService}，前端轮询 {@code GET /api/ai/paper/job/{jobId}}；</li>
 * <li><b>取数在请求线程，只有调模型在任务线程</b>：报表、题库列表、项目 schema 都受行级权限约束，
 * 而 {@code ai-job} 线程没有登录态。把取数留在请求线程，既不用在后台线程里伪造 SecurityContext，
 * 也能让「这场考试还没有答卷」「题库里没有题」这类问题<b>立刻</b>以 400 反馈——让老师等 40 秒
 * 才在轮询结果里看到失败是最差的体验；</li>
 * <li><b>隐私红线</b>：进提示词的只有「考点名 + 得分率 + 原卷题数 + 题干 + 分值」这些统计数字。
 * 学员姓名、账号、原始作答内容<b>一个字都不发</b>；本类唯一能碰到 {@link Answer} 的地方是
 * {@link #scoreRates}，它只读 {@code exam_info.question_score}，读完只留下每题的合计分与作答数；</li>
 * <li><b>不写库</b>：结果只是预览（题目原样带 id / 答案 / 分值），老师点「采纳」时走既有的
 * {@code POST /api/ai/paper/apply}，与 AI 组卷同一条路径——AI 挑错题最多多看一眼，不会把卷子改坏。
 * 请求里的 {@code targetProjectId} 只用来<b>提前</b>校验目标项目的写权限（老师预览完就会点采纳，
 * 晚一步报 403 不如早一步），本服务不往任何项目里写题。</li>
 * </ol>
 *
 * <p><b>得分率为什么要读两个口径</b>：报表 {@link ReportData#getStatistics()} 的平均分只对「答案是数字」的题
 * （评分题、打分题）存在；考试卷的逐题得分落在 {@code t_answer.exam_info.question_score} 里
 * （{@link Answer} 的 {@code examInfo}），选择题的 answer 只有「选项 id → 是否选中」。
 * 所以先用考试口径聚合逐题得分，再用报表口径补那些没有 exam_info 的数值型题；两条口径都算不出就明确报错，
 * 绝不拿「0 分」冒充「没答」。
 *
 * <p>另外一条防坑：含主观题且还有答卷处于 {@code grade_status=pending} 时，主观题按 0 分入库
 * （{@link AnswerScoreEvaluator#isManual} 的口径），直接参与排名会把「还没批改」误判成「错得最多」，
 * 所以这种情况下主观题整体不参与薄弱点排名。
 *
 * @author ai-actions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiPracticeRecommendServiceImpl implements AiPracticeRecommendService {

	/** 提示词模板 id（{@code server/ai/src/main/resources/prompts/practice-recommend.md}） */
	private static final String PROMPT_PRACTICE = "practice-recommend";

	/** 默认抽多少道重练题 */
	private static final int DEFAULT_QUESTION_COUNT = 20;

	/** 一次最多抽多少道：再多就不是「补练」而是「重考」了 */
	private static final int MAX_QUESTION_COUNT = 50;

	/** 最多看几个薄弱考点：8 个已经够铺满一次课后练习，再散就抓不住重点 */
	private static final int MAX_WEAK_QUESTIONS = 8;

	/** 每个考点最多贡献几道候选题 */
	private static final int PER_FOCUS_CANDIDATES = 20;

	/** 进提示词的候选题总上限（与 AI 组卷的 maxCandidates 默认值保持一致） */
	private static final int MAX_CANDIDATES = 120;

	/** 题干进提示词的长度：够模型认出考点，又不至于把提示词撑爆 */
	private static final int MAX_TITLE_CHARS = 80;

	/** 没有章节也没有标签时，用题干前几个字当考点名 */
	private static final int FOCUS_TITLE_CHARS = 20;

	/** 按题名做关键词匹配的最短长度：两个字的关键词几乎能命中一切 */
	private static final int TITLE_MATCH_MIN_CHARS = 4;

	/** 摘要长度上限（前端是一行提示，不是小作文） */
	private static final int MAX_SUMMARY_CHARS = 400;

	/** 题库题没配分值时按「总分 100 / 题数」平均分配 */
	private static final double DEFAULT_TOTAL_SCORE = 100D;

	/** 答卷的「待批改」状态（{@code Answer#gradeStatus}；主观题此时按 0 分入库，不能当薄弱点） */
	private static final String GRADE_STATUS_PENDING = "pending";

	/** 模型爱给 id 加的包装：剥一层再比对，剥完不在候选里就丢弃 */
	private static final String[] WRAPPER_PREFIX = { "`", "\"", "「", "'" };

	private static final String[] WRAPPER_SUFFIX = { "`", "\"", "」", "'" };

	/** 题型中文名：与 {@code AiPaperSpec} 的标签保持一致（那份是私有常量，不值得为了复用把它公开） */
	private static final Map<SurveySchema.QuestionType, String> TYPE_LABELS = new EnumMap<>(
			SurveySchema.QuestionType.class);

	static {
		TYPE_LABELS.put(SurveySchema.QuestionType.Radio, "单选");
		TYPE_LABELS.put(SurveySchema.QuestionType.Checkbox, "多选");
		TYPE_LABELS.put(SurveySchema.QuestionType.Judge, "判断");
		TYPE_LABELS.put(SurveySchema.QuestionType.FillBlank, "填空");
		TYPE_LABELS.put(SurveySchema.QuestionType.MultipleBlank, "多项填空");
		TYPE_LABELS.put(SurveySchema.QuestionType.Textarea, "简答");
		TYPE_LABELS.put(SurveySchema.QuestionType.Select, "下拉");
		TYPE_LABELS.put(SurveySchema.QuestionType.HorzBlank, "横线填空");
	}

	private final AiAssistSupport support;

	private final AiJobService aiJobService;

	private final ReportService reportService;

	private final TemplateService templateService;

	private final RepoService repoService;

	private final AnswerMapper answerMapper;

	@Override
	public String recommend(AiPracticeRecommendRequest request) {
		if (request == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要分析的考试");
		}
		String sourceProjectId = trim(request.getSourceProjectId());
		if (!StringUtils.hasText(sourceProjectId)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要分析的考试");
		}
		String repoId = trim(request.getRepoId());
		if (!StringUtils.hasText(repoId)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要从哪个题库抽题");
		}
		String classId = trim(request.getClassId());
		int questionCount = normalizeCount(request.getQuestionCount());
		// 闸门顺序：先项目（顺带给出「项目不存在」），再题库（getRpo 内部判可读性），最后目标项目与额度
		ProjectView project = support.readableProject(sourceProjectId);
		RepoView repo = repoService.getRpo(repoId);
		if (repo == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题库不存在或已删除");
		}
		String targetProjectId = trim(request.getTargetProjectId());
		if (StringUtils.hasText(targetProjectId)) {
			support.assertProjectEditable(targetProjectId);
		}
		String userId = SecurityContextUtils.getUserId();
		// 提交时就判一次额度：这个任务要跑几十秒，让老师等完才看到「今天用完了」比直接拒绝更糟
		support.assertQuota(userId);

		List<SurveySchema> questions = support.questions(project);
		if (questions.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "这场考试还没有题目，先组一份卷子再分析");
		}
		ReportData report = reportService.getData(sourceProjectId, true, classId);
		int answers = report == null || report.getTotal() == null ? 0 : report.getTotal().intValue();
		if (answers <= 0) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "这场考试还没有答卷，无法分析薄弱考点");
		}
		Map<String, Double> rates = scoreRates(questions, report, sourceProjectId, classId);
		if (rates.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"这场考试算不出逐题得分率（题目没配分值，或主观题还没批改完），请先给每题配好分值");
		}
		List<Weak> weak = rankWeak(questions, rates);
		List<AiPracticeRecommendView.Focus> focuses = new ArrayList<>();
		List<String> focusLines = new ArrayList<>();
		groupFocus(weak, focuses, focusLines);
		List<Candidate> candidates = loadCandidates(repoId, focuses);
		if (candidates.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "这个题库里还没有能用于重练的题目，请先往题库里加题");
		}
		Plan plan = new Plan(questionCount, candidates, indexById(candidates), focuses,
				buildFocusText(focusLines, answers), buildCandidateText(candidates), sourceProjectId, repoId);
		String scene = AiUsageService.SCENE_PRACTICE_RECOMMEND;
		log.info("提交 AI 错题重练任务: project={}, repo={}, classId={}, answers={}, weak={}, focus={}, candidates={}, count={}",
				sourceProjectId, repoId, classId, answers, weak.size(), focuses.size(), candidates.size(), questionCount);
		return aiJobService.submit(scene, userId, context -> run(context, plan, userId, scene));
	}

	/* ====== 任务体：调模型 → 组结果 ====== */

	private void run(AiJobService.JobContext context, Plan plan, String userId, String scene) {
		Map<String, String> vars = new LinkedHashMap<>();
		vars.put("focus", plan.focusText());
		vars.put("candidates", plan.candidateText());
		vars.put("questionCount", String.valueOf(plan.questionCount()));
		vars.put("perFocus", String.valueOf(Math.max(1, Math.min(PER_FOCUS_CANDIDATES, plan.questionCount()))));
		AiRequest request = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_PRACTICE, vars))
				.userPrompt("请从候选题里挑出 " + plan.questionCount() + " 道重练题，只输出 JSON。")
				// 挑题是「按考点匹配」，不需要发散：温度压低，模型的挑选理由也更稳定
				.temperature(Double.valueOf(0.3D))
				// 后台任务：跳过「每用户每分钟 N 次」的限流，否则一次重练会被自己卡死
				.background(true).build();
		context.progress(10);
		AiCompletion completion = support.call(scene, userId, request, true);
		context.progress(75);
		Picks picks = parsePicks(completion.getText(), plan.byId(), plan.questionCount());
		Selection selection = choose(plan, picks);
		List<SurveySchema> questions = buildQuestions(selection.chosen());
		if (questions.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题库里的题目结构不完整，带不出可用的重练题，请检查题库");
		}
		countRecommended(plan, selection);
		AiPracticeRecommendView view = new AiPracticeRecommendView();
		view.setQuestions(questions);
		view.setFocus(plan.focuses());
		view.setSummary(buildSummary(plan, picks, selection, questions));
		view.setStats(support.summarize(questions));
		context.progress(92);
		context.result(view);
		log.info("AI 错题重练完成: project={}, repo={}, focus={}, candidates={}, picked={}, random={}, questions={}",
				plan.sourceProjectId(), plan.repoId(), plan.focuses().size(), plan.candidates().size(),
				selection.fromModel(), selection.randomFilled(), questions.size());
	}

	/** 解析模型挑题结果：不认识的 id、重复 id 一律丢弃，全部无效时交给随机补齐（不让整单失败） */
	private Picks parsePicks(String json, Map<String, Candidate> byId, int limit) {
		JsonNode root = support.readJson(json, "错题重练");
		if (root == null || root.isMissingNode()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "错题重练结果解析失败：模型返回了空内容，请重试");
		}
		List<String> ids = new ArrayList<>();
		// 模型偶尔直接给一个数组：两种形状都认，别为格式问题让老师重试
		JsonNode picks = root.isArray() ? root : root.path("picks");
		if (picks.isArray()) {
			for (JsonNode node : picks) {
				String id = stripWrappers(node.path("id").asText(""));
				if (!StringUtils.hasText(id) || !byId.containsKey(id) || ids.contains(id)) {
					continue;
				}
				ids.add(id);
				if (ids.size() >= limit) {
					break;
				}
			}
		}
		if (ids.isEmpty()) {
			// 模型没挑出可用题（或挑的 id 都不在候选里）：按考点随机补齐，至少让老师看到结果
			log.warn("AI 错题重练：模型没有给出可用的候选题 id，改为按考点随机补齐");
		}
		String summary = root.path("summary").asText("");
		return new Picks(ids, StringUtils.hasText(summary) ? summary.trim() : null);
	}

	/** 模型挑中的先用，不够的从余下候选题里随机补（结果里会写明补了几道） */
	private Selection choose(Plan plan, Picks picks) {
		List<Candidate> chosen = new ArrayList<>();
		Set<String> used = new HashSet<>();
		for (String id : picks.ids()) {
			if (chosen.size() >= plan.questionCount()) {
				break;
			}
			Candidate candidate = plan.byId().get(id);
			if (candidate == null || !used.add(id)) {
				continue;
			}
			chosen.add(candidate);
		}
		int fromModel = chosen.size();
		if (chosen.size() < plan.questionCount()) {
			List<Candidate> rest = new ArrayList<>();
			for (Candidate candidate : plan.candidates()) {
				if (!used.contains(candidate.id())) {
					rest.add(candidate);
				}
			}
			Collections.shuffle(rest, new Random());
			for (Candidate candidate : rest) {
				if (chosen.size() >= plan.questionCount()) {
					break;
				}
				chosen.add(candidate);
				used.add(candidate.id());
			}
		}
		return new Selection(chosen, fromModel, chosen.size() - fromModel);
	}

	/** 候选题 → 可写进画布的题目：id 用题库题 id，分值缺省按「总分 100 / 题数」平均分 */
	private List<SurveySchema> buildQuestions(List<Candidate> chosen) {
		List<Candidate> usable = new ArrayList<>();
		for (Candidate candidate : chosen) {
			if (candidate.schema() != null && candidate.schema().getType() != null) {
				usable.add(candidate);
			}
		}
		if (usable.isEmpty()) {
			return List.of();
		}
		double average = DEFAULT_TOTAL_SCORE / usable.size();
		List<SurveySchema> questions = new ArrayList<>();
		Set<String> ids = new HashSet<>();
		for (Candidate candidate : usable) {
			SurveySchema question = toQuestion(candidate, average);
			if (question == null || !ids.add(question.getId())) {
				continue;
			}
			questions.add(question);
		}
		return questions;
	}

	private SurveySchema toQuestion(Candidate candidate, double defaultScore) {
		SurveySchema schema;
		try {
			// 与 ComposeServiceImpl#toQuestion 同一条转换：走 JSON 复制一份，避免把题库实体对象带进项目 schema
			schema = support.json().convertValue(candidate.schema(), SurveySchema.class);
		}
		catch (RuntimeException e) {
			log.warn("AI 错题重练：题库题转换失败 id={}, {}", candidate.id(), AiAssistSupport.messageOf(e));
			return null;
		}
		if (schema == null) {
			return null;
		}
		schema.setId(candidate.id());
		SurveySchema.Attribute attribute = schema.getAttribute() == null ? new SurveySchema.Attribute()
				: schema.getAttribute();
		attribute.setExamScore(Double.valueOf(round1(candidate.score() > 0D ? candidate.score() : defaultScore)));
		attribute.setRequired(Boolean.TRUE);
		schema.setAttribute(attribute);
		if (!StringUtils.hasText(schema.getChapter())) {
			schema.setChapter(candidate.chapter());
		}
		if (!StringUtils.hasText(schema.getDifficulty())) {
			schema.setDifficulty(candidate.difficulty());
		}
		rebuildDataSource(schema);
		return schema;
	}

	/**
	 * 选择题的选项列表按 children 重建（与 {@code ComposeServiceImpl#rebuildDataSource} 同一处理）。
	 *
	 * <p>两个理由：一是题库里改过选项后 dataSource 可能是旧的，直接进画布会出现「选项列表里有、点开没有」
	 * 的错位；二是老师点「采纳」时会走 {@code AiContentGuard#checkAccepted}，它要求 choices 的
	 * dataSource 与 children **一一对上**——重建一次，存量题里的脏 dataSource 才不会让整批采纳被拒。
	 */
	private void rebuildDataSource(SurveySchema question) {
		SurveySchema.QuestionType type = question.getType();
		if (type != SurveySchema.QuestionType.Radio && type != SurveySchema.QuestionType.Checkbox
				&& type != SurveySchema.QuestionType.Judge) {
			return;
		}
		if (CollectionUtils.isEmpty(question.getChildren())) {
			return;
		}
		List<SurveySchema.DataSource> sources = new ArrayList<>();
		for (SurveySchema child : question.getChildren()) {
			if (child == null || !StringUtils.hasText(child.getId()) || !StringUtils.hasText(child.getTitle())) {
				continue;
			}
			SurveySchema.DataSource source = new SurveySchema.DataSource();
			source.setLabel(child.getTitle());
			source.setValue(child.getId());
			sources.add(source);
		}
		question.setDataSource(sources.isEmpty() ? null : sources);
	}

	/** 每个考点实际推荐了几道：按候选题的归属统计，随机补齐的不算进任何考点 */
	private void countRecommended(Plan plan, Selection selection) {
		Map<String, Integer> counts = new LinkedHashMap<>();
		for (Candidate candidate : selection.chosen()) {
			if (!StringUtils.hasText(candidate.focus())) {
				continue;
			}
			counts.merge(candidate.focus(), Integer.valueOf(1),
					(left, right) -> Integer.valueOf(left.intValue() + right.intValue()));
		}
		for (AiPracticeRecommendView.Focus focus : plan.focuses()) {
			Integer count = counts.get(focus.getPoint());
			focus.setRecommended(Integer.valueOf(count == null ? 0 : count.intValue()));
		}
	}

	/* ====== 取数：得分率 / 薄弱点 ====== */

	/**
	 * 每题得分率（0~1）：{@code questionId → 得分率}，只含有分值且能算出平均分的题。
	 *
	 * <p>两条口径合并（见类注释）：先按 {@code exam_info.question_score} 聚合考试逐题得分，
	 * 再用报表 {@link ReportData#getStatistics()} 补数值型题。这里只读汇总分，
	 * <b>不读、也不保留任何学员原始作答</b>。
	 */
	private Map<String, Double> scoreRates(List<SurveySchema> questions, ReportData report, String projectId,
			String classId) {
		Map<String, SurveySchema> byId = new LinkedHashMap<>();
		for (SurveySchema question : questions) {
			if (question != null && StringUtils.hasText(question.getId())) {
				byId.put(question.getId(), question);
			}
		}
		boolean hasPending = false;
		Map<String, double[]> accumulator = new LinkedHashMap<>();
		for (Answer answer : answersOf(projectId, classId)) {
			if (answer == null) {
				continue;
			}
			if (GRADE_STATUS_PENDING.equals(answer.getGradeStatus())) {
				hasPending = true;
			}
			if (answer.getExamInfo() == null || answer.getExamInfo().getQuestionScore() == null) {
				continue;
			}
			for (Map.Entry<String, Double> entry : answer.getExamInfo().getQuestionScore().entrySet()) {
				if (!byId.containsKey(entry.getKey()) || entry.getValue() == null) {
					continue;
				}
				double[] cell = accumulator.computeIfAbsent(entry.getKey(), key -> new double[2]);
				cell[0] += entry.getValue().doubleValue();
				cell[1] += 1D;
			}
		}
		Map<String, Double> rates = new LinkedHashMap<>();
		for (Map.Entry<String, double[]> entry : accumulator.entrySet()) {
			SurveySchema question = byId.get(entry.getKey());
			double full = fullScoreOf(question);
			if (full <= 0D || entry.getValue()[1] <= 0D) {
				continue;
			}
			if (hasPending && AnswerScoreEvaluator.isManual(question)) {
				continue;
			}
			rates.put(entry.getKey(), Double.valueOf(clamp01(entry.getValue()[0] / entry.getValue()[1] / full)));
		}
		Map<String, ReportData.Data> statistics = report.getStatistics() == null ? Map.of()
				: report.getStatistics();
		for (SurveySchema question : questions) {
			if (question == null) {
				continue;
			}
			String questionId = question.getId();
			if (!StringUtils.hasText(questionId) || rates.containsKey(questionId)) {
				continue;
			}
			ReportData.Data stat = statistics.get(questionId);
			double full = fullScoreOf(question);
			if (stat == null || stat.getAverage() == null || full <= 0D) {
				continue;
			}
			if (hasPending && AnswerScoreEvaluator.isManual(question)) {
				continue;
			}
			rates.put(questionId, Double.valueOf(clamp01(stat.getAverage().doubleValue() / full)));
		}
		return rates;
	}

	/** 只取判分用得到的列：whole answer JSON 太大，这里明确不读 */
	private List<Answer> answersOf(String projectId, String classId) {
		List<Answer> answers = answerMapper.selectList(Wrappers.<Answer>lambdaQuery()
				.select(Answer::getExamInfo, Answer::getGradeStatus)
				.eq(Answer::getProjectId, projectId)
				.eq(StringUtils.hasText(classId), Answer::getClassId, classId));
		return answers == null ? List.of() : answers;
	}

	/** 得分率升序取前 {@link #MAX_WEAK_QUESTIONS} 题：越低越需要重练 */
	private List<Weak> rankWeak(List<SurveySchema> questions, Map<String, Double> rates) {
		List<Weak> list = new ArrayList<>();
		for (SurveySchema question : questions) {
			if (question == null || !StringUtils.hasText(question.getId())) {
				continue;
			}
			Double rate = rates.get(question.getId());
			if (rate == null) {
				continue;
			}
			list.add(new Weak(question, rate.doubleValue(), fullScoreOf(question)));
		}
		list.sort(Comparator.comparingDouble(Weak::rate));
		return list.size() <= MAX_WEAK_QUESTIONS ? list : new ArrayList<>(list.subList(0, MAX_WEAK_QUESTIONS));
	}

	/**
	 * 按考点聚合：chapter → 标签 → 题干关键词，三级兜底保证每个薄弱题都能落到一个考点上。
	 *
	 * <p>输出按考点得分率升序：分组的插入顺序只反映「组里最弱那道题」的顺序，聚完一组之后整体得分率
	 * 可能被拉高，所以这里再排一次，前端和提示词看到的口径一致。
	 */
	private void groupFocus(List<Weak> weak, List<AiPracticeRecommendView.Focus> focuses, List<String> focusLines) {
		LinkedHashMap<String, Group> groups = new LinkedHashMap<>();
		for (Weak item : weak) {
			groups.computeIfAbsent(pointOf(item.question()), Group::new).add(item);
		}
		List<Group> ordered = new ArrayList<>(groups.values());
		ordered.sort(Comparator.comparingDouble(Group::rate));
		for (Group group : ordered) {
			AiPracticeRecommendView.Focus focus = new AiPracticeRecommendView.Focus();
			focus.setPoint(group.point());
			focus.setRate(Double.valueOf(round3(group.rate())));
			focus.setQuestions(Integer.valueOf(group.size()));
			focus.setRecommended(Integer.valueOf(0));
			focuses.add(focus);
			// 进提示词的只有「考点名 / 得分率 / 题量 / 主要题型」这类统计数字，不带任何学员信息
			focusLines.add("考点「" + group.point() + "」 | 得分率 " + Math.round(group.rate() * 100D) + "% | 原卷 "
					+ group.size() + " 题 | 主要题型："
					+ typeLabel(group.first().question().getType()));
		}
	}

	private static String pointOf(SurveySchema question) {
		String chapter = question.getChapter();
		if (StringUtils.hasText(chapter)) {
			return chapter.trim();
		}
		if (!CollectionUtils.isEmpty(question.getTags())) {
			for (String tag : question.getTags()) {
				if (StringUtils.hasText(tag)) {
					return tag.trim();
				}
			}
		}
		String keyword = AiAssistSupport.plainTitle(question.getTitle(), FOCUS_TITLE_CHARS);
		return StringUtils.hasText(keyword) ? keyword : "未标注考点";
	}

	/* ====== 题库候选 ====== */

	/**
	 * 按考点从题库捞候选题。
	 *
	 * <p>先把题库整池读一遍（与组卷同一口径，见 {@link #loadRepoPool} 的注释），再按「章节 = 考点 / 标签 = 考点 / 题名包含考点」
	 * 在内存里筛：一次查询比按考点逐个打 DB 便宜，也不会因为某个考点的措辞不完全一致而漏题。
	 * 某个考点在题库里一道都没有时<b>跨章节回退</b>到整池（不把这一档晾空），回退来的题不归属任何考点。
	 */
	private List<Candidate> loadCandidates(String repoId, List<AiPracticeRecommendView.Focus> focuses) {
		List<TemplateView> pool = loadRepoPool(repoId);
		if (CollectionUtils.isEmpty(pool)) {
			return List.of();
		}
		LinkedHashMap<String, Candidate> candidates = new LinkedHashMap<>();
		for (AiPracticeRecommendView.Focus focus : focuses) {
			List<TemplateView> hits = match(pool, focus.getPoint());
			boolean fallback = hits.isEmpty();
			if (fallback) {
				// 整池打乱再取：不打乱的话「题库里没有这个考点」的每一次推荐都会抽到最前面那几道题
				List<TemplateView> shuffled = new ArrayList<>(pool);
				Collections.shuffle(shuffled, new Random());
				hits = shuffled;
			}
			int added = 0;
			for (TemplateView template : hits) {
				if (added >= PER_FOCUS_CANDIDATES || candidates.size() >= MAX_CANDIDATES) {
					break;
				}
				Candidate candidate = toCandidate(template, fallback ? null : focus.getPoint());
				if (candidate == null || candidates.containsKey(candidate.id())) {
					continue;
				}
				candidates.put(candidate.id(), candidate);
				added++;
			}
			if (candidates.size() >= MAX_CANDIDATES) {
				break;
			}
		}
		return new ArrayList<>(candidates.values());
	}

	private List<TemplateView> loadRepoPool(String repoId) {
		TemplateQuery query = new TemplateQuery();
		query.setRepoId(repoId);
		query.setCurrent(1);
		// 全量读（pageSize=-1）：与组卷 {@code AiPaperPickServiceImpl} 和 ComposeServiceImpl 同一口径——
		// 一个题库的题量按「能整份读进内存」设计。截断反而更糟：某个考点的题刚好排在后面，
		// 就会被当成「题库里没有这个考点」，推荐的题直接跑偏。
		query.setPageSize(-1);
		// 走 TemplateService 而不是直接查表：题库可读性（共享 / 授权 / 班级分配）那一层判断在它里面
		PaginationResponse<TemplateView> page = templateService.listTemplate(query);
		if (page == null || CollectionUtils.isEmpty(page.getList())) {
			return List.of();
		}
		log.info("AI 错题重练：题库 {} 的 {} 道题进入候选池", repoId, Integer.valueOf(page.getList().size()));
		return page.getList();
	}

	private List<TemplateView> match(List<TemplateView> pool, String point) {
		List<TemplateView> hits = new ArrayList<>();
		for (TemplateView template : pool) {
			if (matches(template, point)) {
				hits.add(template);
			}
		}
		return hits;
	}

	private static boolean matches(TemplateView template, String point) {
		if (template == null || !StringUtils.hasText(point)) {
			return false;
		}
		if (point.equalsIgnoreCase(trim(template.getChapter()))) {
			return true;
		}
		if (template.getTag() != null) {
			for (String tag : template.getTag()) {
				if (point.equalsIgnoreCase(trim(tag))) {
					return true;
				}
			}
		}
		// 题干关键词兜底：短词匹配会命中一切，至少 4 个字才按「题名包含」算
		return point.length() >= TITLE_MATCH_MIN_CHARS && containsIgnoreCase(template.getName(), point);
	}

	private Candidate toCandidate(TemplateView template, String focusPoint) {
		if (template == null || !StringUtils.hasText(template.getId())) {
			return null;
		}
		SurveySchema schema = template.getTemplate();
		if (schema == null || schema.getType() == null) {
			return null;
		}
		// 只挑能自动判分的题型（与组卷共用同一份 SUPPORTED_TYPES）：重练题会被采纳进项目，
		// 判不出分的题进了卷子，交卷时就会变成「永远拿不到分」的那道题
		if (!AiPaperSpec.SUPPORTED_TYPES.contains(schema.getType())) {
			return null;
		}
		String title = StringUtils.hasText(template.getName()) ? template.getName() : schema.getTitle();
		if (!StringUtils.hasText(title)) {
			return null;
		}
		return new Candidate(template.getId(), typeLabel(schema.getType()), trim(template.getChapter()),
				joinTags(template.getTag()), trim(template.getDifficulty()), fullScoreOf(schema),
				AiAssistSupport.plainTitle(title, MAX_TITLE_CHARS), schema, focusPoint);
	}

	/* ====== 文本拼装 ====== */

	private String buildFocusText(List<String> focusLines, int answerCount) {
		StringBuilder text = new StringBuilder();
		text.append("本次统计的答卷数：").append(answerCount).append('\n');
		for (int index = 0; index < focusLines.size(); index++) {
			text.append(index + 1).append(". ").append(focusLines.get(index)).append('\n');
		}
		return text.toString();
	}

	private String buildCandidateText(List<Candidate> candidates) {
		StringBuilder text = new StringBuilder();
		for (Candidate candidate : candidates) {
			text.append("- id=").append(candidate.id()).append(" | 题型：").append(candidate.type())
					.append(" | 章节：").append(StringUtils.hasText(candidate.chapter()) ? candidate.chapter() : "未标注")
					.append(" | 标签：").append(StringUtils.hasText(candidate.tags()) ? candidate.tags() : "无")
					.append(" | 分值：")
					.append(candidate.score() > 0D ? AiAssistSupport.formatScore(candidate.score()) + " 分" : "未设置")
					.append(" | 题干：").append(candidate.title()).append('\n');
		}
		return text.toString();
	}

	private String buildSummary(Plan plan, Picks picks, Selection selection, List<SurveySchema> questions) {
		StringBuilder text = new StringBuilder();
		String modelSummary = AiAssistSupport.oneLine(picks.summary(), MAX_SUMMARY_CHARS);
		if (StringUtils.hasText(modelSummary)) {
			text.append(modelSummary);
		}
		else {
			text.append("已按这场考试得分率最低的 ").append(plan.focuses().size()).append(" 个考点，从题库抽了 ")
					.append(questions.size()).append(" 道重练题。");
		}
		if (selection.randomFilled() > 0) {
			text.append("（其中 ").append(selection.randomFilled()).append(" 道是题库里符合考点的题不够时随机补齐的）");
		}
		if (questions.size() < plan.questionCount()) {
			text.append("（题库里可用的题只有 ").append(questions.size()).append(" 道，已全部给出）");
		}
		if (selection.chosen().size() > questions.size()) {
			text.append("（有 ").append(selection.chosen().size() - questions.size())
					.append(" 道题因为题库数据不完整没能带出来）");
		}
		return text.toString();
	}

	/* ====== 小工具 ====== */

	private static int normalizeCount(Integer value) {
		if (value == null) {
			return DEFAULT_QUESTION_COUNT;
		}
		return Math.max(1, Math.min(MAX_QUESTION_COUNT, value.intValue()));
	}

	private static Map<String, Candidate> indexById(List<Candidate> candidates) {
		Map<String, Candidate> index = new LinkedHashMap<>();
		for (Candidate candidate : candidates) {
			index.put(candidate.id(), candidate);
		}
		return index;
	}

	/** 题目满分：没配分值（或配成 0）的题不参与得分率计算 */
	private static double fullScoreOf(SurveySchema question) {
		if (question == null || question.getAttribute() == null || question.getAttribute().getExamScore() == null) {
			return 0D;
		}
		double score = question.getAttribute().getExamScore().doubleValue();
		return score > 0D ? score : 0D;
	}

	private static String typeLabel(SurveySchema.QuestionType type) {
		if (type == null) {
			return "未标注";
		}
		return TYPE_LABELS.getOrDefault(type, type.name());
	}

	/** 模型偶尔把 id 包在反引号 / 引号 / 「」里：只剥一层，剥完不在候选里就丢弃 */
	private static String stripWrappers(String raw) {
		if (!StringUtils.hasText(raw)) {
			return null;
		}
		String value = raw.trim();
		for (String prefix : WRAPPER_PREFIX) {
			if (value.length() > 2 && value.startsWith(prefix)) {
				value = value.substring(prefix.length()).trim();
				break;
			}
		}
		for (String suffix : WRAPPER_SUFFIX) {
			if (value.length() > 2 && value.endsWith(suffix)) {
				value = value.substring(0, value.length() - suffix.length()).trim();
				break;
			}
		}
		return value;
	}

	private static String joinTags(String[] tags) {
		if (tags == null) {
			return null;
		}
		StringBuilder text = new StringBuilder();
		for (String tag : tags) {
			if (!StringUtils.hasText(tag)) {
				continue;
			}
			if (text.length() > 0) {
				text.append(',');
			}
			text.append(tag.trim());
		}
		return text.length() == 0 ? null : text.toString();
	}

	private static boolean containsIgnoreCase(String text, String keyword) {
		if (!StringUtils.hasText(text) || !StringUtils.hasText(keyword)) {
			return false;
		}
		return text.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
	}

	private static String trim(String value) {
		return StringUtils.hasText(value) ? value.trim() : null;
	}

	private static double clamp01(double value) {
		return Math.max(0D, Math.min(1D, value));
	}

	private static double round1(double value) {
		return Math.round(value * 10D) / 10D;
	}

	private static double round3(double value) {
		return Math.round(value * 1000D) / 1000D;
	}

	/* ====== 内部数据结构（请求线程构建、任务线程只读） ====== */

	/** 一次推荐任务的全部输入：在请求线程准备好，任务线程不再碰任何受权限约束的服务 */
	private record Plan(int questionCount, List<Candidate> candidates, Map<String, Candidate> byId,
			List<AiPracticeRecommendView.Focus> focuses, String focusText, String candidateText,
			String sourceProjectId, String repoId) {
	}

	/** 一道候选题：id / 展示字段 / 原始 schema（转换前的题库副本） */
	private record Candidate(String id, String type, String chapter, String tags, String difficulty, double score,
			String title, SurveySchema schema, String focus) {
	}

	/** 一个薄弱考点：名称 + 成员（用于加权算整体得分率） */
	private static final class Group {

		private final String point;

		private final List<Weak> items = new ArrayList<>();

		private Group(String point) {
			this.point = point;
		}

		private String point() {
			return point;
		}

		private void add(Weak item) {
			items.add(item);
		}

		private int size() {
			return items.size();
		}

		private Weak first() {
			return items.get(0);
		}

		/** 考点得分率按满分加权：3 道 5 分题与 1 道 20 分题不该等权 */
		private double rate() {
			double weighted = 0D;
			double total = 0D;
			for (Weak item : items) {
				weighted += item.rate() * item.full();
				total += item.full();
			}
			if (total > 0D) {
				return weighted / total;
			}
			double sum = 0D;
			for (Weak item : items) {
				sum += item.rate();
			}
			return items.isEmpty() ? 0D : sum / items.size();
		}

	}

	/** 一道薄弱题：题目 + 得分率 + 满分 */
	private record Weak(SurveySchema question, double rate, double full) {
	}

	/** 模型挑的 id 与摘要 */
	private record Picks(List<String> ids, String summary) {
	}

	/** 最终选中的候选题：模型挑了几道、随机补了几道 */
	private record Selection(List<Candidate> chosen, int fromModel, int randomFilled) {
	}

}
