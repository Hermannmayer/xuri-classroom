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



































@Service
@RequiredArgsConstructor
@Slf4j
public class AiRepoAuditServiceImpl implements AiRepoAuditService {


	private static final String PROMPT_AUDIT = "repo-audit";


	private static final String PROMPT_DUP = "repo-audit-dup";


	private static final int DEFAULT_LIMIT = 40;


	private static final int MAX_LIMIT = 120;


	private static final int BATCH_SIZE = 20;


	private static final int MAX_SCAN_TEMPLATES = 1000;


	private static final int SCAN_PAGE_SIZE = 200;


	private static final int MAX_DUP_GROUPS = 30;


	private static final int DUP_BATCH_SIZE = 8;


	private static final int MAX_TITLE_CHARS = 400;


	private static final int MAX_OPTION_CHARS = 400;


	private static final int MAX_ANALYSIS_CHARS = 200;


	private static final int MAX_CHAPTER_CHARS = 40;


	private static final int MAX_TAG_COUNT = 5;


	private static final int MAX_TAG_CHARS = 20;


	private static final int MAX_REASON_CHARS = 200;


	private static final int MAX_PATCH_TITLE_CHARS = 60;


	private static final int MAX_DUP_COMPARE_CHARS = 300;


	private static final int MIN_DUP_TITLE = 8;


	private static final double NEAR_DUP_THRESHOLD = 0.82D;


	private static final double MIN_DUPLICATE_SIMILARITY = 0.6D;


	private static final String DIFFICULTY_EASY = "easy";

	private static final String DIFFICULTY_MEDIUM = "medium";

	private static final String DIFFICULTY_HARD = "hard";


	private static final Set<SurveySchema.QuestionType> CHOICE_TYPES = Set.of(SurveySchema.QuestionType.Radio,
			SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Judge,
			SurveySchema.QuestionType.Select);


	private static final Set<SurveySchema.QuestionType> BLANK_TYPES = Set.of(SurveySchema.QuestionType.FillBlank,
			SurveySchema.QuestionType.MultipleBlank, SurveySchema.QuestionType.Textarea,
			SurveySchema.QuestionType.HorzBlank);

	private final AiAssistSupport support;

	private final AiJobService aiJobService;

	private final RepoService repoService;

	private final TemplateService templateService;

	/** ====== ① 体检（异步） ====== */

	@Override
	public String audit(AiRepoAuditRequest request) {
		if (request == null || !StringUtils.hasText(request.getRepoId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要体检的题库");
		}
		String repoId = request.getRepoId().trim();


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

			support.assertQuota(userId);
		}
		Options options = new Options(repoId, repo.getName(), chapter, templateIds, limit, includeAnalysis,
				includeDuplicates, userId);


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

	/** ====== 选题：显式指定 → 按章节 → 按「缺什么」排优先级 ====== */

	private Scan loadCandidates(AiJobService.JobContext context, Options options) {
		Set<String> wanted = new LinkedHashSet<>(options.templateIds());
		if (!wanted.isEmpty()) {

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

				if (!Objects.equals(options.repoId(), template.getRepoId())) {
					continue;
				}

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

		truncated = scanned.size() >= MAX_SCAN_TEMPLATES;
		if (scanned.size() > MAX_SCAN_TEMPLATES) {
			scanned = new ArrayList<>(scanned.subList(0, MAX_SCAN_TEMPLATES));
		}


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


			log.warn("题目题面为空（schema 缺失），跳过：templateId={}", templateId);
			return null;
		}
	}

	/** ====== 确定性检查（不花 token） ====== */

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

				continue;
			}
			patches.add(patch);
		}
		return patches;
	}

	/** ====== 模型检查②：重复题 ====== */

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

			log.warn("题库体检：AI 查重失败，退化为字面完全相同：{}", AiAssistSupport.messageOf(e));
			return literalDuplicates(groups);
		}
	}

	/** 字面预筛：先把「去标签、去空白与标点」之后的题干分组 */
	private List<DupGroup> preScreen(List<Candidate> candidates) {
		Map<String, List<Candidate>> byText = new LinkedHashMap<>();
		List<String> keys = new ArrayList<>(candidates.size());
		for (Candidate candidate : candidates) {

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

	/** ====== ② 应用建议（同步） ====== */

	@Override
	public int apply(AiRepoAuditApplyRequest request) {
		if (request == null || !StringUtils.hasText(request.getRepoId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要写回的题库");
		}
		String repoId = request.getRepoId().trim();

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

			if (!handled.add(templateId)) {
				continue;
			}
			try {
				if (applyOne(repoId, templateId, patch)) {
					updated++;
				}
			}
			catch (RuntimeException e) {

				failed++;
				if (firstFailure == null) {
					firstFailure = e;
				}
				log.warn("题库体检：写回失败 templateId={}, {}", templateId, AiAssistSupport.messageOf(e));
			}
		}
		if (updated == 0 && firstFailure != null) {

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

	/** 写一道题：只动老师勾中的字段，且每个字段都先和库里现状比一遍，没变化就不写 */
	private boolean applyOne(String repoId, String templateId, AiRepoAuditView.Patch patch) {
		TemplateView current = readView(templateId);
		if (current == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题目不存在、已被删除，或题面为空");
		}

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

			return false;
		}


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

	/** ====== 结果摘要 ====== */

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

	/** ====== 小工具 ====== */

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

	/** 参考答案：选择题的答案存的是「选项自己的 id」，要换成选项文字；填空/简答存的是答案文本 */
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

	/** 有没有解析：解析允许是富文本，空的 {@code } 也算没有 */
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




	private record Options(String repoId, String repoName, String chapter, List<String> templateIds, int limit,
			boolean includeAnalysis, boolean includeDuplicates, String userId) {
	}


	private record Scan(List<Candidate> items, boolean truncated) {
	}





	private record Candidate(String id, String title, SurveySchema schema, String chapter, String difficulty,
			String[] tag, int priority) {
	}


	private record DupGroup(List<Candidate> items, double similarity, boolean literalEqual) {
	}


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
