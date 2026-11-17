package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiJobService;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiPaperCheckView;
import cn.surveyking.server.domain.dto.AiRepoAuditApplyRequest;
import cn.surveyking.server.domain.dto.AiRepoAuditRequest;
import cn.surveyking.server.domain.dto.AiRepoAuditView;
import cn.surveyking.server.domain.dto.RepoView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateBatchRequest;
import cn.surveyking.server.domain.dto.TemplateQuery;
import cn.surveyking.server.domain.dto.TemplateRequest;
import cn.surveyking.server.domain.dto.TemplateView;
import cn.surveyking.server.service.AiRepoAuditService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.RepoService;
import cn.surveyking.server.service.TemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
	* 题库体检：把「这个题库哪里不完整」变成一份可勾选的建议清单，再把老师勾中的那几项写回。
	*
	* <p>为什么是「先给建议、再应用」两步，而不是体检完直接改库：题库是全校共用的资产，
	* 一道题的解析一旦被模型改写就再也回不去了；而体检的产出（难度、章节、标签、解析）恰恰都是
	* 老师自己更有判断力的东西。所以这里只负责「挑出最该修的题 + 给出建议」，写回必须由老师勾选触发，
	* 接口也拆成 {@code /repo/audit} 与 {@code /repo/audit/apply} 两条、权限口径不同。
	*
	* <p>检查分两层，原因不同：
	* <ul>
	* <li><b>确定性检查</b>（不花 token）：题干为空、选择题没有选项、没有标注正确答案——
	* 这些是「组进卷子就会出事故」的硬伤，模型既判断不了也不该花钱去判断；</li>
	* <li><b>模型检查</b>：补难度 / 章节 / 标签 / 解析、判定两道题是不是真的重复——
	* 这是需要读懂题目内容才能做的事。</li>
	* </ul>
	*
	* <p>三道成本闸门（这台机器只有 4 核、学生还在答题）：
	* <ol>
	* <li>一次最多体检 {@link #MAX_LIMIT} 道题，默认 {@link #DEFAULT_LIMIT} 道；</li>
	* <li>每批最多 {@link #BATCH_SIZE} 道题发给模型，题目再多就多批，单批失败只丢一批；</li>
	* <li>查重先做字面预筛，最多把 {@link #MAX_DUP_GROUPS} 组候选交给模型。</li>
	* </ol>
	*
	* <p>写回时有三个「读源码才知道」的坑，实现里都处理了：
	* <ol>
	* <li>{@code TemplateBatchRequest} <b>没有</b> chapter 字段——章节只能走 {@code updateTemplate}；</li>
	* <li>{@code batchPatchTemplate} 的 {@code appendTag} 默认是 true（追加），
	* AI 给的是「这道题完整的标签集合」，所以要显式传 false 才是覆盖；</li>
	* <li>题库编辑器的弹窗回填读的是 schema 里的 {@code chapter / difficulty / tags}，不是 t_template 的列，
	* 所以只写列会出现「列表里是中等、点开编辑器却是未填写」——写回时两边一起对齐。</li>
	* </ol>
	*
	* @author ai-actions
	*/
@Service
@RequiredArgsConstructor
@Slf4j
public class AiRepoAuditServiceImpl implements AiRepoAuditService {

	/** 提示词：逐题补全难度 / 章节 / 标签 / 解析 */
	private static final String PROMPT_AUDIT = "repo-audit";

	/** 提示词：重复题判定 */
	private static final String PROMPT_DUP = "repo-audit-dup";

	/** 默认一次体检多少题 */
	private static final int DEFAULT_LIMIT = 40;

	/** 一次最多体检多少题（成本闸门：每道题都要模型看一遍） */
	private static final int MAX_LIMIT = 120;

	/** 一次发给模型的题数上限 */
	private static final int BATCH_SIZE = 20;

	/** 自动挑题时最多扫多少道题：再大的题库请按章节体检 */
	private static final int MAX_SCAN_TEMPLATES = 1000;

	/** 扫描分页大小 */
	private static final int SCAN_PAGE_SIZE = 200;

	/** 一轮最多把多少组候选题交给模型判重 */
	private static final int MAX_DUP_GROUPS = 30;

	/** 一次发给模型的候选组数 */
	private static final int DUP_BATCH_SIZE = 8;

	/** 进提示词的题干最大长度 */
	private static final int MAX_TITLE_CHARS = 400;

	/** 进提示词的选项 / 参考答案最大长度 */
	private static final int MAX_OPTION_CHARS = 400;

	/** 建议解析的最大长度（提示词里也要求 200 字） */
	private static final int MAX_ANALYSIS_CHARS = 200;

	/** 建议章节的最大长度 */
	private static final int MAX_CHAPTER_CHARS = 40;

	/** 建议标签个数上限 */
	private static final int MAX_TAG_COUNT = 5;

	/** 单个标签的最大长度 */
	private static final int MAX_TAG_CHARS = 20;

	/** 建议理由的最大长度 */
	private static final int MAX_REASON_CHARS = 200;

	/** 前端列表里显示的题干摘要长度 */
	private static final int MAX_PATCH_TITLE_CHARS = 60;

	/** 查重时参与比对的题干最大长度：再长的题干截断，避免编辑距离退化成平方级开销 */
	private static final int MAX_DUP_COMPARE_CHARS = 300;

	/** 题干短于这个长度不参与查重（「1+1=？」这类短题字面接近是常态） */
	private static final int MIN_DUP_TITLE = 8;

	/** 字面相似度达到这个值才交给模型判重 */
	private static final double NEAR_DUP_THRESHOLD = 0.82D;

	/** 模型给出的相似度低于这个值、且没建议 merge 的组不展示 */
	private static final double MIN_DUPLICATE_SIMILARITY = 0.6D;

	/** 难度口径：DTO / 提示词里统一用 easy / medium / hard，题库列里存的是 易 / 中 / 难 */
	private static final String DIFFICULTY_EASY = "easy";

	private static final String DIFFICULTY_MEDIUM = "medium";

	private static final String DIFFICULTY_HARD = "hard";

	/** 判断题、选择题：必须有选项，且必须有选项标了正确答案 */
	private static final Set<SurveySchema.QuestionType> CHOICE_TYPES = Set.of(SurveySchema.QuestionType.Radio,
			SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Judge,
			SurveySchema.QuestionType.Select);

	/** 填空 / 简答：标准答案存在 children 的 examCorrectAnswer 上 */
	private static final Set<SurveySchema.QuestionType> BLANK_TYPES = Set.of(SurveySchema.QuestionType.FillBlank,
			SurveySchema.QuestionType.MultipleBlank, SurveySchema.QuestionType.Textarea,
			SurveySchema.QuestionType.HorzBlank);

	private final AiAssistSupport support;

	private final AiJobService aiJobService;

	private final RepoService repoService;

	private final TemplateService templateService;

	/* ====== ① 体检（异步） ====== */

	@Override
	public String audit(AiRepoAuditRequest request) {
		if (request == null || !StringUtils.hasText(request.getRepoId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要体检的题库");
		}
		String repoId = request.getRepoId().trim();
		// 题库读闸门：题库不存在、或当前账号看不到这个题库，都在建任务之前挡住——
		// 任务线程里再抛 403，老师只会看到一条「任务失败」，不如当场告诉他
		RepoView repo = repoService.getRpo(repoId);
		if (repo == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题库不存在或已被删除");
		}
		int limit = request.getLimit() == null ? DEFAULT_LIMIT
				: Math.max(1, Math.min(MAX_LIMIT, request.getLimit().intValue()));
		boolean includeAnalysis = !Boolean.FALSE.equals(request.getIncludeAnalysis());
		boolean includeDuplicates = !Boolean.FALSE.equals(request.getIncludeDuplicates());
		List<String> templateIds = request.getTemplateIds() == null ? List.of()
				: request.getTemplateIds().stream().filter(StringUtils::hasText).map(String::trim).distinct().toList();
		String chapter = StringUtils.hasText(request.getChapter()) ? request.getChapter().trim() : null;
		String userId = SecurityContextUtils.getUserId();
		if (includeAnalysis || includeDuplicates) {
			// 这两个开关都会调模型：提交时先判一次额度，别让老师等完一轮扫描才看到「今天用完了」
			support.assertQuota(userId);
		}
		Options options = new Options(repoId, repo.getName(), chapter, templateIds, limit, includeAnalysis,
				includeDuplicates, userId);
		// 任务线程拿不到请求线程的登录态：这里抓一次，在任务里显式设置——
		// 题库体检要逐题走 TemplateService 的读闸门，没有登录态会全部变成「没有权限」
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return aiJobService.submit(AiUsageService.SCENE_REPO_AUDIT, userId, context -> {
			SecurityContextHolder.getContext().setAuthentication(authentication);
			try {
				run(context, options);
			}
			finally {
				SecurityContextHolder.clearContext();
			}
		});
	}

	/** 任务体：选题 → 确定性检查 → 逐批补全建议 → 查重 → 出结果 */
	private void run(AiJobService.JobContext context, Options options) {
		context.progress(5);
		Scan scan = loadCandidates(context, options);
		List<Candidate> candidates = scan.items();
		AiRepoAuditView view = new AiRepoAuditView();
		view.setChecked(Integer.valueOf(candidates.size()));
		if (candidates.isEmpty()) {
			view.setSummary(StringUtils.hasText(options.chapter())
					? "「" + repoName(options) + "」的「" + options.chapter() + "」章节里没有可体检的题目"
					: "「" + repoName(options) + "」里没有可体检的题目（题库为空，或题目都已被删除）");
			context.progress(99);
			context.result(view);
			return;
		}
		Stats stats = Stats.of(candidates);
		context.progress(20);
		// 确定性检查先做：不花 token，而且「这道题根本没有答案」比「解析写得不好」紧急得多
		checkStructure(candidates, view);
		context.progress(30);
		int failedBatches = 0;
		if (options.includeAnalysis()) {
			List<AiRepoAuditView.Patch> patches = new ArrayList<>();
			failedBatches = collectPatches(context, options, candidates, patches);
			view.setPatches(patches);
		}
		context.progress(85);
		if (options.includeDuplicates()) {
			view.setDuplicates(detectDuplicates(candidates, options.userId()));
		}
		context.progress(95);
		view.setSummary(summarize(options, view, stats, failedBatches, scan.truncated()));
		context.progress(99);
		context.result(view);
		log.info("AI 题库体检完成: repoId={}, checked={}, issues={}, patches={}, duplicates={}, failedBatches={}",
				options.repoId(), view.getChecked(), view.getIssues().size(), view.getPatches().size(),
				view.getDuplicates().size(), failedBatches);
	}

	/* ====== 选题：显式指定 → 按章节 → 按「缺什么」排优先级 ====== */

	private Scan loadCandidates(AiJobService.JobContext context, Options options) {
		Set<String> wanted = new LinkedHashSet<>(options.templateIds());
		if (!wanted.isEmpty()) {
			// 老师点名要体检这几道：按给的顺序逐道读，读完就走，不去扫整个题库
			List<Candidate> picked = new ArrayList<>();
			int index = 0;
			for (String templateId : wanted) {
				context.progress(Math.min(14, 4 + 10 * index / Math.max(1, wanted.size())));
				index++;
				TemplateView template;
				try {
					template = readView(templateId);
				}
				catch (RuntimeException e) {
					log.warn("题库体检：读取题目失败 templateId={}, {}", templateId, AiAssistSupport.messageOf(e));
					continue;
				}
				Candidate candidate = template == null ? null : toCandidate(template);
				if (candidate == null) {
					continue;
				}
				// 只体检本题库的题：账号可能同时能读好几个题库，传错 id 不该把别的库的题混进来
				if (!Objects.equals(options.repoId(), template.getRepoId())) {
					continue;
				}
				// 同时给了章节就再筛一道：只体检「这个章节里的这几道题」
				if (StringUtils.hasText(options.chapter()) && !options.chapter().equals(candidate.chapter())) {
					continue;
				}
				picked.add(candidate);
				if (picked.size() >= options.limit()) {
					break;
				}
			}
			return new Scan(picked, false);
		}

		TemplateQuery query = new TemplateQuery();
		query.setRepoId(options.repoId());
		query.setPageSize(Integer.valueOf(SCAN_PAGE_SIZE));
		if (StringUtils.hasText(options.chapter())) {
			query.setChapter(List.of(options.chapter()));
		}
		List<Candidate> scanned = new ArrayList<>();
		boolean truncated = false;
		int page = 0;
		while (scanned.size() < MAX_SCAN_TEMPLATES) {
			query.setCurrent(Integer.valueOf(++page));
			PaginationResponse<TemplateView> result;
			try {
				// listTemplate 里自带 assertReadableRepo 的读闸门，与我们上面那次 getRpo 同一口径
				result = templateService.listTemplate(query);
			}
			catch (RuntimeException e) {
				log.warn("题库体检：读取题目列表失败 repoId={}, {}", options.repoId(), AiAssistSupport.messageOf(e));
				break;
			}
			if (result == null || CollectionUtils.isEmpty(result.getList())) {
				break;
			}
			List<TemplateView> items = result.getList();
			for (TemplateView item : items) {
				Candidate candidate = toCandidate(item);
				if (candidate != null) {
					scanned.add(candidate);
				}
			}
			if (items.size() < SCAN_PAGE_SIZE) {
				break;
			}
		}
		// 命中扫描上限：说明题库比一次体检能覆盖的更大，摘要里提示老师按章节分批
		truncated = scanned.size() >= MAX_SCAN_TEMPLATES;
		if (scanned.size() > MAX_SCAN_TEMPLATES) {
			scanned = new ArrayList<>(scanned.subList(0, MAX_SCAN_TEMPLATES));
		}
		// 优先级：缺解析 → 缺难度 → 缺章节 → 缺标签 → 什么都不缺（用来凑够 limit，查重才有材料）
		// 稳定排序：同一优先级内保持题号顺序，老师重新体检时看到的还是同一批题
		scanned.sort(Comparator.comparingInt(Candidate::priority));
		if (scanned.size() > options.limit()) {
			return new Scan(new ArrayList<>(scanned.subList(0, options.limit())), truncated);
		}
		return new Scan(scanned, truncated);
	}

	/** 列表页的一行 → 体检候选；题面 schema 缺失的脏数据直接跳过 */
	private Candidate toCandidate(TemplateView view) {
		if (view == null || !StringUtils.hasText(view.getId()) || view.getTemplate() == null) {
			return null;
		}
		SurveySchema schema = view.getTemplate();
		SurveySchema.QuestionType type = view.getQuestionType() == null ? schema.getType() : view.getQuestionType();
		// 分页 / 说明 / 分节这类空节点没有题干也没有答案，体检它们没有意义
		if (type != null && SurveySchema.QuestionType.voidType().contains(type)) {
			return null;
		}
		if (schema.getType() == null && type != null) {
			schema.setType(type);
		}
		String title = SchemaHelper.trimHtmlTag(schema.getTitle());
		if (!StringUtils.hasText(title)) {
			title = SchemaHelper.trimHtmlTag(view.getName());
		}
		String chapter = currentChapter(view);
		String difficulty = currentDifficulty(view);
		String[] tag = view.getTag() == null ? schemaTags(schema) : view.getTag();
		int priority = !hasAnalysis(schema) ? 0
				: !StringUtils.hasText(difficulty) ? 1
				: !StringUtils.hasText(chapter) ? 2 : isEmptyTag(tag) ? 3 : 4;
		return new Candidate(view.getId(), title, schema, chapter, difficulty, tag, priority);
	}

	/** 按 id 读一道题（走 TemplateService 的读闸门）；题面 schema 为空的脏数据返回 null */
	private TemplateView readView(String templateId) {
		TemplateQuery query = new TemplateQuery();
		query.setId(templateId);
		try {
			return templateService.getTemplate(query);
		}
		catch (NullPointerException e) {
			// TemplateServiceImpl#getTemplate 直接对 template 字段调用 setId()，schema 为空就会 NPE——
			// 这是脏数据而不是程序 bug，跳过这道题比让整个体检 500 更有意义
			log.warn("题目题面为空（schema 缺失），跳过：templateId={}", templateId);
			return null;
		}
	}

	/* ====== 确定性检查（不花 token） ====== */

	private void checkStructure(List<Candidate> candidates, AiRepoAuditView view) {
		for (int index = 0; index < candidates.size(); index++) {
			Candidate candidate = candidates.get(index);
			SurveySchema schema = candidate.schema();
			String label = "第 " + (index + 1) + " 题"
					+ (StringUtils.hasText(candidate.title())
							? "「" + AiAssistSupport.oneLine(candidate.title(), 20) + "」"
							: "");
			if (!StringUtils.hasText(candidate.title())) {
				view.getIssues().add(issue("format", "blocker", candidate.id(), label + "题干为空",
						"补上题干，或者直接删除这道题"));
			}
			SurveySchema.QuestionType type = schema.getType();
			if (type == null) {
				view.getIssues().add(issue("format", "blocker", candidate.id(), label + "没有题型",
						"重新选择题型后再保存"));
				continue;
			}
			if (CHOICE_TYPES.contains(type)) {
				boolean hasOptions = !CollectionUtils.isEmpty(schema.getChildren());
				if (!hasOptions && CollectionUtils.isEmpty(schema.getDataSource())) {
					view.getIssues().add(issue("format", "blocker", candidate.id(),
							label + "是" + typeLabel(type) + "，但没有选项",
							"重新编辑选项：选择题必须有选项子题，否则考生看不到任何可选内容"));
				}
				else if (!hasOptions) {
					view.getIssues().add(issue("format", "blocker", candidate.id(),
							label + "只有选项列表、没有选项子题",
							"重新保存一次题目，让选项子题与选项列表对齐（判分读的是选项子题）"));
				}
				else if (schema.getChildren().size() < 2) {
					view.getIssues().add(issue("format", "warning", candidate.id(), label + "只有 1 个选项",
							"补足至少 2 个选项，否则组卷后无法作答"));
				}
				if (!hasCorrectOption(schema) && !hasAttributeAnswer(schema)) {
					view.getIssues().add(issue("no_answer", "blocker", candidate.id(), label + "没有标注正确答案",
							"在选项上勾选正确答案，否则组卷后无法自动判分"));
				}
				continue;
			}
			if (BLANK_TYPES.contains(type)) {
				if (CollectionUtils.isEmpty(schema.getChildren())) {
					view.getIssues().add(issue("no_answer", "blocker", candidate.id(), label + "缺少标准答案",
							"补上参考答案（填空题的答案存在空位上）"));
				}
				else if (!hasCorrectOption(schema) && !hasAttributeAnswer(schema)) {
					view.getIssues().add(issue("no_answer", "blocker", candidate.id(), label + "的参考答案为空",
							"补上参考答案，否则组卷后无法自动判分"));
				}
			}
		}
	}

	/* ====== 模型检查①：补难度 / 章节 / 标签 / 解析 ====== */

	/** 逐批调模型补全建议；返回「模型没给出结果的批数」 */
	private int collectPatches(AiJobService.JobContext context, Options options, List<Candidate> candidates,
			List<AiRepoAuditView.Patch> patches) {
		Map<String, Candidate> byId = new LinkedHashMap<>();
		for (Candidate candidate : candidates) {
			byId.put(candidate.id(), candidate);
		}
		String chapters = joinChapters(candidates);
		String tags = joinTags(candidates);
		int batches = (candidates.size() + BATCH_SIZE - 1) / BATCH_SIZE;
		int failed = 0;
		for (int index = 0; index < batches; index++) {
			int from = index * BATCH_SIZE;
			List<Candidate> batch = candidates.subList(from, Math.min(from + BATCH_SIZE, candidates.size()));
			context.progress(30 + 55 * index / Math.max(1, batches));
			try {
				patches.addAll(askPatches(batch, byId, chapters, tags, options.userId()));
			}
			catch (ErrorCodeException e) {
				// 额度用完（「今日…已达上限」）就别再一批批烧下去了：整单停下比继续调更负责
				if (isQuotaExceeded(e)) {
					throw e;
				}
				failed++;
				log.warn("题库体检：第 {} 批题目模型没给出结果：{}", index + 1, AiAssistSupport.messageOf(e));
			}
			catch (RuntimeException e) {
				failed++;
				log.warn("题库体检：第 {} 批题目异常：{}", index + 1, AiAssistSupport.messageOf(e));
			}
		}
		return failed;
	}

	private List<AiRepoAuditView.Patch> askPatches(List<Candidate> batch, Map<String, Candidate> byId, String chapters,
			String tags, String userId) {
		Map<String, String> vars = new LinkedHashMap<>();
		vars.put("questions", buildQuestions(batch));
		vars.put("chapters", chapters);
		vars.put("tags", tags);
		AiRequest request = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_AUDIT, vars))
				.userPrompt("请按上面的要求给出这批题目的补全建议，只输出 JSON。").temperature(Double.valueOf(0.3D))
				// 后台任务：跳过「每分钟 N 次」的限流，否则一次体检几十道题会被自己卡死
				.background(true).build();
		AiCompletion completion = support.call(AiUsageService.SCENE_REPO_AUDIT, userId, request, true);
		return parsePatches(completion == null ? null : completion.getText(), byId, batch);
	}

	/** 一批题目 → 提示词里的题目清单（题干去标签、选项与参考答案都带上，模型才判得出难度和解析） */
	private String buildQuestions(List<Candidate> batch) {
		StringBuilder text = new StringBuilder();
		int index = 0;
		for (Candidate candidate : batch) {
			index++;
			SurveySchema schema = candidate.schema();
			text.append('[').append(index).append("] id=").append(candidate.id()).append('\n');
			text.append("题型：").append(typeLabel(schema.getType())).append('\n');
			text.append("题干：").append(AiAssistSupport.plainTitle(candidate.title(), MAX_TITLE_CHARS)).append('\n');
			String options = optionsText(schema);
			if (StringUtils.hasText(options)) {
				text.append("选项：").append(options).append('\n');
			}
			String answer = answerText(schema);
			text.append("参考答案：").append(StringUtils.hasText(answer) ? answer : "（未提供）").append('\n');
			text.append("当前难度：")
					.append(StringUtils.hasText(candidate.difficulty()) ? candidate.difficulty() : "未标注")
					.append('\n');
			text.append("当前章节：").append(StringUtils.hasText(candidate.chapter()) ? candidate.chapter() : "未标注")
					.append('\n');
			text.append("当前标签：").append(isEmptyTag(candidate.tag()) ? "无" : String.join("、", tagList(candidate.tag())))
					.append('\n');
			text.append("当前解析：").append(hasAnalysis(schema) ? "已有（不需要补）" : "无（请补）").append('\n');
		}
		return text.toString();
	}

	private List<AiRepoAuditView.Patch> parsePatches(String json, Map<String, Candidate> byId, List<Candidate> batch) {
		JsonNode root = support.readJson(json, "AI 题库体检");
		JsonNode array = root == null ? null : (root.isArray() ? root : root.path("patches"));
		List<AiRepoAuditView.Patch> patches = new ArrayList<>();
		if (array == null || !array.isArray()) {
			return patches;
		}
		Set<String> allowed = new HashSet<>();
		for (Candidate candidate : batch) {
			allowed.add(candidate.id());
		}
		for (JsonNode node : array) {
			String id = text(node, "id");
			// 模型编出来的 id、或别的批次的题：一律丢掉（脏数据不能让整单 500，也不能串批）
			if (id == null || !allowed.contains(id)) {
				continue;
			}
			Candidate candidate = byId.get(id);
			if (candidate == null) {
				continue;
			}
			AiRepoAuditView.Patch patch = new AiRepoAuditView.Patch();
			patch.setId(candidate.id());
			patch.setTitle(AiAssistSupport.plainTitle(candidate.title(), MAX_PATCH_TITLE_CHARS));
			patch.setDifficulty(normalizeDifficulty(text(node, "difficulty")));
			patch.setChapter(truncate(text(node, "chapter"), MAX_CHAPTER_CHARS));
			patch.setAnalysis(truncate(text(node, "analysis"), MAX_ANALYSIS_CHARS));
			List<String> tags = readTags(node.path("tags"));
			if (tags != null) {
				patch.setTags(tags);
			}
			patch.setReason(truncate(text(node, "reason"), MAX_REASON_CHARS));
			if (patch.getDifficulty() == null && patch.getChapter() == null && patch.getAnalysis() == null
					&& patch.getTags() == null) {
				// 一个要改的字段都没有：这道题已经填全了，不放进建议列表
				continue;
			}
			patches.add(patch);
		}
		return patches;
	}

	/* ====== 模型检查②：重复题 ====== */

	private List<AiRepoAuditView.Duplicate> detectDuplicates(List<Candidate> candidates, String userId) {
		Map<String, Candidate> byId = new LinkedHashMap<>();
		for (Candidate candidate : candidates) {
			byId.put(candidate.id(), candidate);
		}
		List<DupGroup> groups = preScreen(candidates);
		if (groups.isEmpty()) {
			return List.of();
		}
		try {
			List<AiRepoAuditView.Duplicate> duplicates = new ArrayList<>();
			for (int from = 0; from < groups.size(); from += DUP_BATCH_SIZE) {
				List<DupGroup> batch = groups.subList(from, Math.min(from + DUP_BATCH_SIZE, groups.size()));
				duplicates.addAll(askDuplicates(batch, byId, userId));
			}
			return duplicates;
		}
		catch (RuntimeException e) {
			// 查重失败不能拖垮整单：退化成「字面完全相同」这一档，至少把最明显的重复列出来
			log.warn("题库体检：AI 查重失败，退化为字面完全相同：{}", AiAssistSupport.messageOf(e));
			return literalDuplicates(groups);
		}
	}

	/**
	 * 字面预筛：先把「去标签、去空白与标点」之后的题干分组。
	 *
	 * <p>为什么要预筛：一次体检 40~120 道题，两两比较是 780~7140 对，
	 * 全发给模型既贵又慢；而且真正要模型判断的只有字面已经很像的那些对。
	 */
	private List<DupGroup> preScreen(List<Candidate> candidates) {
		Map<String, List<Candidate>> byText = new LinkedHashMap<>();
		List<String> keys = new ArrayList<>(candidates.size());
		for (Candidate candidate : candidates) {
			// 归一化只做一次：后面两两比对用的是同一份结果（40~120 道题，别重复去标签）
			String key = normalize(candidate.title());
			keys.add(key);
			if (key.length() < MIN_DUP_TITLE) {
				continue;
			}
			byText.computeIfAbsent(key, ignored -> new ArrayList<>()).add(candidate);
		}
		List<DupGroup> groups = new ArrayList<>();
		Set<String> seenPairs = new HashSet<>();
		for (List<Candidate> same : byText.values()) {
			if (same.size() < 2) {
				continue;
			}
			// 同一个字面文本下的 N 道题合并成一组（N=3 时不要退化成 3 对）
			for (int left = 0; left < same.size(); left++) {
				for (int right = left + 1; right < same.size(); right++) {
					seenPairs.add(pairKey(same.get(left).id(), same.get(right).id()));
				}
			}
			groups.add(new DupGroup(new ArrayList<>(same), 1D, true));
			if (groups.size() >= MAX_DUP_GROUPS) {
				return groups;
			}
		}
		for (int left = 0; left < candidates.size() && groups.size() < MAX_DUP_GROUPS; left++) {
			String a = keys.get(left);
			if (a.length() < MIN_DUP_TITLE) {
				continue;
			}
			for (int right = left + 1; right < candidates.size() && groups.size() < MAX_DUP_GROUPS; right++) {
				Candidate leftItem = candidates.get(left);
				Candidate rightItem = candidates.get(right);
				if (!seenPairs.add(pairKey(leftItem.id(), rightItem.id()))) {
					continue;
				}
				String b = keys.get(right);
				if (b.length() < MIN_DUP_TITLE) {
					continue;
				}
				double similarity = literalSimilarity(a, b);
				if (similarity < NEAR_DUP_THRESHOLD) {
					continue;
				}
				groups.add(new DupGroup(List.of(leftItem, rightItem), similarity, false));
			}
		}
		return groups;
	}

	private List<AiRepoAuditView.Duplicate> askDuplicates(List<DupGroup> batch, Map<String, Candidate> byId,
			String userId) {
		Map<String, String> vars = new LinkedHashMap<>();
		vars.put("pairs", buildPairs(batch));
		AiRequest request = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_DUP, vars))
				.userPrompt("请按上面的口径判断这些候选组是否重复，只输出 JSON。").temperature(Double.valueOf(0.1D))
				.background(true).build();
		AiCompletion completion = support.call(AiUsageService.SCENE_REPO_AUDIT, userId, request, true);
		return parseDuplicates(completion == null ? null : completion.getText(), byId);
	}

	private String buildPairs(List<DupGroup> batch) {
		StringBuilder text = new StringBuilder();
		int index = 0;
		for (DupGroup group : batch) {
			index++;
			text.append('[').append(index).append("] ids=");
			List<String> ids = new ArrayList<>(group.items().size());
			for (Candidate candidate : group.items()) {
				ids.add(candidate.id());
			}
			text.append(String.join(",", ids)).append('\n');
			for (Candidate candidate : group.items()) {
				text.append("- ").append(candidate.id()).append("：")
						.append(AiAssistSupport.plainTitle(candidate.title(), MAX_TITLE_CHARS)).append('\n');
			}
			text.append("字面相似度：").append(round2(group.similarity()))
					.append(group.literalEqual() ? "（题干文字完全相同）" : "（按文字比对，未看语义）").append('\n');
		}
		return text.toString();
	}

	private List<AiRepoAuditView.Duplicate> parseDuplicates(String json, Map<String, Candidate> byId) {
		JsonNode root = support.readJson(json, "AI 查重");
		JsonNode array = root == null ? null : (root.isArray() ? root : root.path("duplicates"));
		List<AiRepoAuditView.Duplicate> duplicates = new ArrayList<>();
		if (array == null || !array.isArray()) {
			return duplicates;
		}
		for (JsonNode node : array) {
			JsonNode idNode = node.path("ids");
			if (!idNode.isArray()) {
				continue;
			}
			List<String> ids = new ArrayList<>();
			List<String> titles = new ArrayList<>();
			Set<String> added = new HashSet<>();
			for (JsonNode item : idNode) {
				String id = item.asText("");
				Candidate candidate = byId.get(id);
				// 只认本次体检里的题：模型编出来的 id 直接丢掉
				if (candidate == null || !added.add(id)) {
					continue;
				}
				ids.add(id);
				titles.add(AiAssistSupport.plainTitle(candidate.title(), MAX_PATCH_TITLE_CHARS));
			}
			if (ids.size() < 2) {
				continue;
			}
			double similarity = clamp(node.path("similarity").asDouble(0D), 0D, 1D);
			String suggestion = normalizeSuggestion(text(node, "suggestion"));
			if (similarity < MIN_DUPLICATE_SIMILARITY && !"merge".equals(suggestion)) {
				// 模型自己都说不像：不要塞进「疑似重复」里浪费老师的注意力
				continue;
			}
			AiRepoAuditView.Duplicate duplicate = new AiRepoAuditView.Duplicate();
			duplicate.setIds(ids);
			duplicate.setTitles(titles);
			duplicate.setSimilarity(Double.valueOf(round2(similarity)));
			duplicate.setReason(truncate(text(node, "reason"), MAX_REASON_CHARS));
			duplicate.setSuggestion(suggestion);
			duplicates.add(duplicate);
		}
		return duplicates;
	}

	/** 模型判定不可用时的兜底：只有「去标点后完全相同」的组才算疑似重复，且建议人工确认 */
	private List<AiRepoAuditView.Duplicate> literalDuplicates(List<DupGroup> groups) {
		List<AiRepoAuditView.Duplicate> duplicates = new ArrayList<>();
		for (DupGroup group : groups) {
			if (!group.literalEqual()) {
				continue;
			}
			List<String> ids = new ArrayList<>();
			List<String> titles = new ArrayList<>();
			for (Candidate candidate : group.items()) {
				ids.add(candidate.id());
				titles.add(AiAssistSupport.plainTitle(candidate.title(), MAX_PATCH_TITLE_CHARS));
			}
			AiRepoAuditView.Duplicate duplicate = new AiRepoAuditView.Duplicate();
			duplicate.setIds(ids);
			duplicate.setTitles(titles);
			duplicate.setSimilarity(Double.valueOf(1D));
			duplicate.setReason("题干文字完全相同（AI 查重不可用，已退化为字面比对，请人工确认选项是否一致）");
			duplicate.setSuggestion("review");
			duplicates.add(duplicate);
		}
		return duplicates;
	}

	/* ====== ② 应用建议（同步） ====== */

	@Override
	public int apply(AiRepoAuditApplyRequest request) {
		if (request == null || !StringUtils.hasText(request.getRepoId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要写回的题库");
		}
		String repoId = request.getRepoId().trim();
		// 题库读闸门：连题库都看不到，就谈不上「往这个题库写建议」
		repoService.getRpo(repoId);
		if (CollectionUtils.isEmpty(request.getPatches())) {
			return 0;
		}
		int updated = 0;
		int failed = 0;
		RuntimeException firstFailure = null;
		Set<String> handled = new HashSet<>();
		for (AiRepoAuditView.Patch patch : request.getPatches()) {
			if (patch == null || !StringUtils.hasText(patch.getId())) {
				continue;
			}
			String templateId = patch.getId().trim();
			// 同一道题传来多条：只认第一条，避免两份互相矛盾的难度打架
			if (!handled.add(templateId)) {
				continue;
			}
			try {
				if (applyOne(repoId, templateId, patch)) {
					updated++;
				}
			}
			catch (RuntimeException e) {
				// 单题失败继续，不让一条脏数据把整批回滚（这里刻意不开事务）
				failed++;
				if (firstFailure == null) {
					firstFailure = e;
				}
				log.warn("题库体检：写回失败 templateId={}, {}", templateId, AiAssistSupport.messageOf(e));
			}
		}
		if (updated == 0 && firstFailure != null) {
			// 一条都没写成功：把第一条原因抛出去，否则前端只看到「更新 0 条」而不知道为什么
			if (firstFailure instanceof ErrorCodeException || firstFailure instanceof AccessDeniedException) {
				throw firstFailure;
			}
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"没有更新任何题目：" + AiAssistSupport.messageOf(firstFailure));
		}
		log.info("题库体检写回完成: repoId={}, patches={}, updated={}, failed={}", repoId,
				Integer.valueOf(request.getPatches().size()), Integer.valueOf(updated), Integer.valueOf(failed));
		return updated;
	}

	/**
	 * 写一道题：只动老师勾中的字段，且每个字段都先和库里现状比一遍，没变化就不写。
	 *
	 * <p>两条写入路径：
	 * <ul>
	 * <li>{@link TemplateService#batchPatchTemplate}：t_template 的 difficulty / tag 两列，
	 * 题库列表筛选、组卷抽题读的就是它们；</li>
	 * <li>{@link TemplateService#updateTemplate}：chapter 列（batchPatchTemplate 没有这个字段）+ 整包 schema
	 * （解析写在 {@code template.attribute.examAnalysis} 上，章节/难度/标签在 schema 里也有一份镜像）。</li>
	 * </ul>
	 * 两条路径都会在服务端再做一次行级校验（{@code assertManageTemplate}：题目创建者或题库管理员），
	 * 这里不做任何绕过。
	 */
	private boolean applyOne(String repoId, String templateId, AiRepoAuditView.Patch patch) {
		TemplateView current = readView(templateId);
		if (current == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题目不存在、已被删除，或题面为空");
		}
		// 只能改本次体检的题库：账号同时有多个题库权限时，跨库写回一定是前端传错了
		if (!Objects.equals(repoId, current.getRepoId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "这道题不属于该题库，已跳过");
		}
		SurveySchema schema = current.getTemplate();
		if (schema == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题目题面为空，请先在题库里重新保存一次");
		}
		String difficulty = toColumnDifficulty(patch.getDifficulty());
		String chapter = truncate(patch.getChapter(), MAX_CHAPTER_CHARS);
		List<String> tags = cleanTags(patch.getTags());
		String analysis = truncate(patch.getAnalysis(), MAX_ANALYSIS_CHARS);

		// 列上的值与 schema 里的镜像分别比较：两者都可能单独缺失（历史导入/直接调接口都会造成漂移）
		boolean columnDifficultyChanged = StringUtils.hasText(difficulty)
				&& !difficulty.equals(trimToNull(current.getDifficulty()));
		boolean schemaDifficultyChanged = StringUtils.hasText(difficulty)
				&& !difficulty.equals(trimToNull(schema.getDifficulty()));
		boolean columnChapterChanged = StringUtils.hasText(chapter)
				&& !chapter.equals(trimToNull(current.getChapter()));
		boolean schemaChapterChanged = StringUtils.hasText(chapter)
				&& !chapter.equals(trimToNull(schema.getChapter()));
		boolean columnTagsChanged = tags != null && !sameTags(current.getTag(), tags);
		boolean schemaTagsChanged = tags != null && !sameTags(schemaTags(schema), tags);
		boolean analysisChanged = StringUtils.hasText(analysis)
				&& !analysis.equals(currentAnalysis(schema));
		if (!columnDifficultyChanged && !schemaDifficultyChanged && !columnChapterChanged && !schemaChapterChanged
				&& !columnTagsChanged && !schemaTagsChanged && !analysisChanged) {
			// 建议值与库里一致：不算一次更新，避免「应用了 40 条」实际什么都没改
			return false;
		}

		// ① 列：难度与标签走题库批量改（appendTag 不传等于 true=追加，AI 给的是完整集合，必须显式覆盖）
		if (columnDifficultyChanged || columnTagsChanged) {
			TemplateBatchRequest batch = new TemplateBatchRequest();
			batch.setIds(List.of(templateId));
			if (columnDifficultyChanged) {
				batch.setDifficulty(difficulty);
			}
			if (columnTagsChanged) {
				batch.setTag(tags.toArray(new String[0]));
				batch.setAppendTag(Boolean.FALSE);
			}
			templateService.batchPatchTemplate(batch);
		}

		// ② 章节 + 整包 schema：解析只能这么写；顺便把 schema 里的章节/难度/标签对齐，
		//    否则打开题库编辑器看到的是旧值（弹窗回填读 template.chapter / template.difficulty / template.tags）。
		//    这一条会重写整包 JSON、还会触发题库级的附件引用回收，所以「只动了列」时不要白跑一趟。
		if (schemaDifficultyChanged || schemaChapterChanged || schemaTagsChanged || analysisChanged
				|| columnChapterChanged) {
			SurveySchema next = schema;
			if (schemaDifficultyChanged) {
				next.setDifficulty(difficulty);
			}
			if (schemaChapterChanged) {
				next.setChapter(chapter);
			}
			if (schemaTagsChanged) {
				next.setTags(new ArrayList<>(tags));
			}
			if (analysisChanged) {
				SurveySchema.Attribute attribute = next.getAttribute() == null ? new SurveySchema.Attribute()
						: next.getAttribute();
				attribute.setExamAnalysis(analysis);
				next.setAttribute(attribute);
			}
			TemplateRequest update = new TemplateRequest();
			update.setId(templateId);
			if (columnChapterChanged) {
				update.setChapter(chapter);
			}
			update.setTemplate(next);
			templateService.updateTemplate(update);
		}
		return true;
	}

	/* ====== 结果摘要 ====== */

	private String summarize(Options options, AiRepoAuditView view, Stats stats, int failedBatches, boolean truncated) {
		StringBuilder text = new StringBuilder();
		text.append("「").append(repoName(options)).append("」体检 ").append(view.getChecked()).append(" 题：缺解析 ")
				.append(stats.noAnalysis).append(" 题、缺难度 ").append(stats.noDifficulty).append(" 题、缺章节 ")
				.append(stats.noChapter).append(" 题、缺标签 ").append(stats.noTags).append(" 题");
		if (!view.getIssues().isEmpty()) {
			text.append("；结构性问题 ").append(view.getIssues().size()).append(" 处");
		}
		if (options.includeDuplicates()) {
			text.append("；疑似重复 ").append(view.getDuplicates().size()).append(" 组");
		}
		if (options.includeAnalysis()) {
			text.append("；给出补全建议 ").append(view.getPatches().size()).append(" 条");
		}
		else {
			text.append("；未启用 AI 补全（只做了结构与字面检查）");
		}
		if (failedBatches > 0) {
			text.append("；").append(failedBatches).append(" 批题目模型没给出结果，可稍后重试");
		}
		if (truncated) {
			text.append("；题库较大，本次只扫了前 ").append(MAX_SCAN_TEMPLATES).append(" 题，建议按章节分批体检");
		}
		text.append("。");
		return text.toString();
	}

	/* ====== 小工具 ====== */

	private static String repoName(Options options) {
		return StringUtils.hasText(options.repoName()) ? options.repoName() : "题库";
	}

	private static AiPaperCheckView.Issue issue(String kind, String severity, String templateId, String message,
			String suggestion) {
		AiPaperCheckView.Issue issue = new AiPaperCheckView.Issue();
		issue.setKind(kind);
		issue.setSeverity(severity);
		List<String> ids = new ArrayList<>(1);
		ids.add(templateId);
		issue.setQuestionIds(ids);
		issue.setMessage(message);
		issue.setSuggestion(suggestion);
		return issue;
	}

	private static String typeLabel(SurveySchema.QuestionType type) {
		if (type == null) {
			return "未标注题型";
		}
		return switch (type) {
			case Radio -> "单选题";
			case Checkbox -> "多选题";
			case Judge -> "判断题";
			case Select -> "下拉选择题";
			case FillBlank -> "填空题";
			case MultipleBlank -> "多项填空题";
			case Textarea -> "简答题";
			case HorzBlank -> "横线题";
			default -> type.name();
		};
	}

	/** 选项文本：题库里的选项存在 children（type=Option）里，dataSource 只是给设计器渲染用的 */
	private static String optionsText(SurveySchema schema) {
		if (CollectionUtils.isEmpty(schema.getChildren())) {
			return null;
		}
		List<String> items = new ArrayList<>();
		for (SurveySchema child : schema.getChildren()) {
			if (child == null) {
				continue;
			}
			String title = SchemaHelper.trimHtmlTag(child.getTitle());
			if (StringUtils.hasText(title)) {
				items.add(title);
			}
		}
		return items.isEmpty() ? null : truncate(String.join("、", items), MAX_OPTION_CHARS);
	}

	/**
	 * 参考答案：选择题的答案存的是「选项自己的 id」，要换成选项文字；填空/简答存的是答案文本。
	 * 也兼容直接挂在题目 attribute 上的写法（部分导入器会这么落库）。
	 */
	private static String answerText(SurveySchema schema) {
		SurveySchema.Attribute attribute = schema.getAttribute();
		if (attribute != null && StringUtils.hasText(attribute.getExamCorrectAnswer())) {
			return truncate(attribute.getExamCorrectAnswer().trim(), MAX_OPTION_CHARS);
		}
		if (CollectionUtils.isEmpty(schema.getChildren())) {
			return null;
		}
		List<String> answers = new ArrayList<>();
		for (SurveySchema child : schema.getChildren()) {
			if (child == null || child.getAttribute() == null
					|| !StringUtils.hasText(child.getAttribute().getExamCorrectAnswer())) {
				continue;
			}
			String value = child.getAttribute().getExamCorrectAnswer().trim();
			String label = optionLabel(schema, value);
			answers.add(StringUtils.hasText(label) ? label : value);
		}
		return answers.isEmpty() ? null : truncate(String.join(" / ", answers), MAX_OPTION_CHARS);
	}

	private static String optionLabel(SurveySchema schema, String optionId) {
		if (CollectionUtils.isEmpty(schema.getChildren())) {
			return null;
		}
		for (SurveySchema child : schema.getChildren()) {
			if (child != null && optionId.equals(child.getId())) {
				String title = SchemaHelper.trimHtmlTag(child.getTitle());
				return StringUtils.hasText(title) ? title : null;
			}
		}
		return null;
	}

	private static boolean hasCorrectOption(SurveySchema schema) {
		if (CollectionUtils.isEmpty(schema.getChildren())) {
			return false;
		}
		for (SurveySchema child : schema.getChildren()) {
			if (child != null && child.getAttribute() != null
					&& StringUtils.hasText(child.getAttribute().getExamCorrectAnswer())) {
				return true;
			}
		}
		return false;
	}

	private static boolean hasAttributeAnswer(SurveySchema schema) {
		return schema.getAttribute() != null && StringUtils.hasText(schema.getAttribute().getExamCorrectAnswer());
	}

	/** 有没有解析：解析允许是富文本，空的 {@code <p></p>} 也算没有 */
	private static boolean hasAnalysis(SurveySchema schema) {
		if (schema == null || schema.getAttribute() == null) {
			return false;
		}
		return StringUtils.hasText(SchemaHelper.trimHtmlTag(schema.getAttribute().getExamAnalysis()));
	}

	private static String currentAnalysis(SurveySchema schema) {
		if (schema == null || schema.getAttribute() == null) {
			return null;
		}
		return trimToNull(schema.getAttribute().getExamAnalysis());
	}

	private static String currentChapter(TemplateView view) {
		String value = trimToNull(view.getChapter());
		if (value != null) {
			return value;
		}
		return view.getTemplate() == null ? null : trimToNull(view.getTemplate().getChapter());
	}

	private static String currentDifficulty(TemplateView view) {
		String value = trimToNull(view.getDifficulty());
		if (value != null) {
			return value;
		}
		return view.getTemplate() == null ? null : trimToNull(view.getTemplate().getDifficulty());
	}

	private static String[] schemaTags(SurveySchema schema) {
		if (schema == null || schema.getTags() == null) {
			return null;
		}
		return schema.getTags().toArray(new String[0]);
	}

	private static boolean isEmptyTag(String[] tag) {
		if (tag == null || tag.length == 0) {
			return true;
		}
		for (String item : tag) {
			if (StringUtils.hasText(item)) {
				return false;
			}
		}
		return true;
	}

	private static List<String> tagList(String[] tag) {
		List<String> values = new ArrayList<>();
		if (tag == null) {
			return values;
		}
		for (String item : tag) {
			if (StringUtils.hasText(item)) {
				values.add(item.trim());
			}
		}
		return values;
	}

	private static boolean sameTags(String[] current, List<String> next) {
		if (next == null) {
			return true;
		}
		Set<String> left = new LinkedHashSet<>(tagList(current));
		return left.equals(new LinkedHashSet<>(next));
	}

	private static String joinChapters(List<Candidate> candidates) {
		Set<String> names = new LinkedHashSet<>();
		for (Candidate candidate : candidates) {
			if (StringUtils.hasText(candidate.chapter())) {
				names.add(candidate.chapter().trim());
			}
			if (names.size() >= 30) {
				break;
			}
		}
		return names.isEmpty() ? "（题库里还没有填过章节）" : String.join("、", names);
	}

	private static String joinTags(List<Candidate> candidates) {
		Set<String> names = new LinkedHashSet<>();
		for (Candidate candidate : candidates) {
			for (String tag : tagList(candidate.tag())) {
				if (StringUtils.hasText(tag)) {
					names.add(tag.trim());
				}
			}
			if (names.size() >= 60) {
				break;
			}
		}
		return names.isEmpty() ? "（题库里还没有标签）" : String.join("、", names);
	}

	/** 难度：DTO 与提示词用 easy / medium / hard，t_template 的列里存的是 易 / 中 / 难 */
	private static String toColumnDifficulty(String value) {
		String difficulty = normalizeDifficulty(value);
		if (difficulty == null) {
			return null;
		}
		if (DIFFICULTY_EASY.equals(difficulty)) {
			return "易";
		}
		if (DIFFICULTY_HARD.equals(difficulty)) {
			return "难";
		}
		return "中";
	}

	/** 各种难度写法归一成 easy / medium / hard；认不出来返回 null（= 不改） */
	private static String normalizeDifficulty(String value) {
		if (!StringUtils.hasText(value)) {
			return null;
		}
		String text = value.trim().toLowerCase(Locale.ROOT);
		return switch (text) {
			case "easy", "简单", "易", "低" -> DIFFICULTY_EASY;
			case "medium", "中等", "中", "一般" -> DIFFICULTY_MEDIUM;
			case "hard", "较难", "难", "高" -> DIFFICULTY_HARD;
			default -> null;
		};
	}

	private static String normalizeSuggestion(String value) {
		return value != null && "merge".equals(value.trim().toLowerCase(Locale.ROOT)) ? "merge" : "review";
	}

	/** 标签：去空、去重、限长限量；空集合返回 null（= 不改），避免把题目原有标签清空 */
	private static List<String> cleanTags(List<String> tags) {
		if (CollectionUtils.isEmpty(tags)) {
			return null;
		}
		List<String> cleaned = new ArrayList<>();
		for (String tag : tags) {
			if (!StringUtils.hasText(tag)) {
				continue;
			}
			String value = tag.trim();
			if (value.length() > MAX_TAG_CHARS) {
				value = value.substring(0, MAX_TAG_CHARS);
			}
			if (!cleaned.contains(value)) {
				cleaned.add(value);
			}
			if (cleaned.size() >= MAX_TAG_COUNT) {
				break;
			}
		}
		return cleaned.isEmpty() ? null : cleaned;
	}

	private static List<String> readTags(JsonNode node) {
		if (node == null || !node.isArray()) {
			return null;
		}
		List<String> tags = new ArrayList<>();
		for (JsonNode item : node) {
			String value = item.isNull() ? "" : item.asText("");
			if (!StringUtils.hasText(value)) {
				continue;
			}
			String tag = value.trim();
			if (tag.length() > MAX_TAG_CHARS) {
				tag = tag.substring(0, MAX_TAG_CHARS);
			}
			if (!tags.contains(tag)) {
				tags.add(tag);
			}
			if (tags.size() >= MAX_TAG_COUNT) {
				break;
			}
		}
		return tags.isEmpty() ? null : tags;
	}

	private static String text(JsonNode node, String field) {
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

	private static String trimToNull(String value) {
		return StringUtils.hasText(value) ? value.trim() : null;
	}

	/** 超长截断并加省略号：宁可显示「…」也不要存进去半句话（脏数据不能让整单 500） */
	private static String truncate(String text, int max) {
		if (!StringUtils.hasText(text)) {
			return null;
		}
		String value = text.trim();
		if (value.length() <= max) {
			return value;
		}
		return value.substring(0, Math.max(0, max - 1)) + "…";
	}

	private static double clamp(double value, double min, double max) {
		return Math.max(min, Math.min(max, value));
	}

	private static double round2(double value) {
		return Math.round(value * 100D) / 100D;
	}

	/** 题干归一：去 HTML、去空白与标点、转小写——只留「认得出是不是同一道题」的字 */
	private static String normalize(String title) {
		String plain = SchemaHelper.trimHtmlTag(title == null ? "" : title).toLowerCase(Locale.ROOT);
		StringBuilder text = new StringBuilder(plain.length());
		for (int index = 0; index < plain.length(); index++) {
			char ch = plain.charAt(index);
			if (Character.isLetterOrDigit(ch)) {
				text.append(ch);
			}
		}
		if (text.length() > MAX_DUP_COMPARE_CHARS) {
			return text.substring(0, MAX_DUP_COMPARE_CHARS);
		}
		return text.toString();
	}

	/** 字面相似度：完全相同 1；包含关系按长度占比；其余用编辑距离换算 */
	private static double literalSimilarity(String a, String b) {
		if (a.equals(b)) {
			return 1D;
		}
		String shorter = a.length() <= b.length() ? a : b;
		String longer = a.length() <= b.length() ? b : a;
		if (shorter.length() >= MIN_DUP_TITLE && longer.contains(shorter)
				&& shorter.length() * 2 >= longer.length()) {
			return (double) shorter.length() / longer.length();
		}
		int allowed = Math.max(2, Math.max(a.length(), b.length()) / 8);
		if (Math.abs(a.length() - b.length()) > allowed) {
			return 0D;
		}
		int distance = editDistance(a, b, allowed);
		if (distance < 0) {
			return 0D;
		}
		return 1D - (double) distance / Math.max(a.length(), b.length());
	}

	/** 带剪枝的编辑距离：距离超过 limit 直接返回 -1（这里只关心「够不够像」，不需要精确值） */
	private static int editDistance(String a, String b, int limit) {
		int rows = a.length();
		int columns = b.length();
		int[] previous = new int[columns + 1];
		int[] current = new int[columns + 1];
		for (int column = 0; column <= columns; column++) {
			previous[column] = column;
		}
		for (int row = 1; row <= rows; row++) {
			current[0] = row;
			int rowMin = current[0];
			for (int column = 1; column <= columns; column++) {
				int cost = a.charAt(row - 1) == b.charAt(column - 1) ? 0 : 1;
				current[column] = Math.min(Math.min(current[column - 1] + 1, previous[column] + 1),
						previous[column - 1] + cost);
				rowMin = Math.min(rowMin, current[column]);
			}
			if (rowMin > limit) {
				return -1;
			}
			int[] swap = previous;
			previous = current;
			current = swap;
		}
		return previous[columns];
	}

	private static String pairKey(String left, String right) {
		return left.compareTo(right) <= 0 ? left + "|" + right : right + "|" + left;
	}

	/** 额度被拦：消息里带「上限」（见 AiUsageServiceImpl#assertQuota 的两条中文提示） */
	private static boolean isQuotaExceeded(ErrorCodeException e) {
		String message = e.getMessage();
		return message != null && message.contains("上限");
	}

	/* ====== 内部数据结构 ====== */

	/** 本次体检的参数（在请求线程里归一好，交给后台任务用，避免任务里再读 SecurityContext） */
	private record Options(String repoId, String repoName, String chapter, List<String> templateIds, int limit,
			boolean includeAnalysis, boolean includeDuplicates, String userId) {
	}

	/** 扫描结果：题目 + 是否因为题库太大被截断 */
	private record Scan(List<Candidate> items, boolean truncated) {
	}

	/**
	 * 一道待体检的题。
	 * @param priority 缺什么：0 缺解析 / 1 缺难度 / 2 缺章节 / 3 缺标签 / 4 什么都不缺（只用来凑数）
	 */
	private record Candidate(String id, String title, SurveySchema schema, String chapter, String difficulty,
			String[] tag, int priority) {
	}

	/** 一组字面相近的候选题：similarity 是字面相似度，literalEqual 表示去标点后完全相同 */
	private record DupGroup(List<Candidate> items, double similarity, boolean literalEqual) {
	}

	/** 体检范围的统计（写进 summary，前端不用自己数） */
	private static final class Stats {

		private int noAnalysis;

		private int noDifficulty;

		private int noChapter;

		private int noTags;

		private static Stats of(List<Candidate> candidates) {
			Stats stats = new Stats();
			for (Candidate candidate : candidates) {
				if (!hasAnalysis(candidate.schema())) {
					stats.noAnalysis++;
				}
				if (!StringUtils.hasText(candidate.difficulty())) {
					stats.noDifficulty++;
				}
				if (!StringUtils.hasText(candidate.chapter())) {
					stats.noChapter++;
				}
				if (isEmptyTag(candidate.tag())) {
					stats.noTags++;
				}
			}
			return stats;
		}

	}

}
