package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiJobService;
import cn.surveyking.server.ai.core.AiPaperSpec;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiPaperJobView;
import cn.surveyking.server.domain.dto.AiPaperPickRequest;
import cn.surveyking.server.domain.dto.AiPaperPickView;
import cn.surveyking.server.domain.dto.RepoView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.TemplateQuery;
import cn.surveyking.server.domain.dto.TemplateView;
import cn.surveyking.server.service.AiPaperPickService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.RepoService;
import cn.surveyking.server.service.TemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;



























@Service
@RequiredArgsConstructor
@Slf4j
public class AiPaperPickServiceImpl implements AiPaperPickService {


	private static final String PROMPT_PICK = "paper-pick";


	private static final int DEFAULT_MAX_CANDIDATES = 120;


	private static final int MAX_CANDIDATES = 300;


	private static final int MAX_SUMMARY_CHARS = 60;


	private static final int MAX_REASON_CHARS = 40;


	private static final int MAX_CHAPTER_HINT = 12;


	private static final Map<String, String> DIFFICULTY_TO_REPO = Map.of("easy", "易", "medium", "中", "hard", "难");

	private final AiAssistSupport support;

	private final AiJobService aiJobService;

	private final RepoService repoService;

	private final TemplateService templateService;

	@Override
	public String pick(AiPaperPickRequest request) {
		if (request == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "组卷参数不能为空");
		}
		List<String> repoIds = clean(request.getRepoIds());
		if (repoIds.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请至少选择一个题库");
		}
		int maxCandidates = request.getMaxCandidates() == null ? DEFAULT_MAX_CANDIDATES
				: Math.max(1, Math.min(MAX_CANDIDATES, request.getMaxCandidates().intValue()));
		List<String> difficulties = clean(request.getDifficulties());
		Map<String, Double> typeRatio = normalizeRatio(request.getTypeRatio());

		AiPaperSpec spec = AiPaperSpec.of(request.getQuestionCount(), request.getTotalScore(), typeRatio,
				resolveDifficulty(difficulties), null, null, request.getRequirements());
		String userId = SecurityContextUtils.getUserId();

		support.assertQuota(userId);
		if (StringUtils.hasText(request.getProjectId())) {
			support.readableProject(request.getProjectId().trim());
		}

		List<RepoView> repos = new ArrayList<>(repoIds.size());
		List<Candidate> candidates = new ArrayList<>();
		List<String> chapters = clean(request.getChapters());
		List<String> repoDifficulties = toRepoDifficulties(difficulties);
		Set<String> types = spec.getTypeRatio().keySet();
		for (String repoId : repoIds) {

			repos.add(repoService.getRpo(repoId));
			candidates.addAll(loadCandidates(repoId, chapters, repoDifficulties, types));
		}
		if (candidates.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"当前条件下题库里没有可用题目：请放宽章节 / 难度，或换一个题库");
		}
		boolean aiSelect = !Boolean.FALSE.equals(request.getAiSelect());
		Map<String, Double> typeScores = normalizeTypeScores(request.getTypeScores());
		log.info("AI 组卷任务: operator={}, repos={}, candidates={}, questionCount={}, aiSelect={}", userId,
				Integer.valueOf(repos.size()), Integer.valueOf(candidates.size()),
				Integer.valueOf(spec.getQuestionCount()), Boolean.valueOf(aiSelect));
		return aiJobService.submit(AiUsageService.SCENE_PAPER_PICK, userId, context -> {
			context.progress(10);
			AiPaperPickView view = assemble(spec, repos, candidates, aiSelect, maxCandidates, typeScores, userId,
					context);
			context.result(view);
		});
	}



	/**
	 * 查一个题库里符合条件的题：章节 / 难度交给 SQL，题型在内存里过滤。
	 *
	 * <p>为什么题型不交给 SQL：{@code TemplateQuery.questionType} 一次只能带一种题型，而组卷要的是
	 * 「配比里那一整组题型」；分题型查 N 次再合并，还不如查一次按枚举筛。
	 *

	 * 「XX 题型题库里只有 N 道」这句话会失真，老师照着放宽条件也补不出题来。
	 * 这里与既有组卷（{@code ComposeServiceImpl})同口径：一个题库的题量按「能整份读进内存」设计。
	 */
	private List<Candidate> loadCandidates(String repoId, List<String> chapters, List<String> difficulties,
			Set<String> types) {
		TemplateQuery query = new TemplateQuery();
		query.setRepoId(repoId);
		query.setCurrent(1);
		query.setPageSize(-1);
		if (!chapters.isEmpty()) {
			query.setChapter(new ArrayList<>(chapters));
		}
		if (!difficulties.isEmpty()) {
			query.setDifficulty(new ArrayList<>(difficulties));
		}
		PaginationResponse<TemplateView> page = templateService.listTemplate(query);
		List<Candidate> candidates = new ArrayList<>();
		if (page == null || CollectionUtils.isEmpty(page.getList())) {
			return candidates;
		}
		for (TemplateView row : page.getList()) {
			if (row == null || !StringUtils.hasText(row.getId()) || row.getQuestionType() == null
					|| row.getTemplate() == null) {

				continue;
			}
			String type = row.getQuestionType().name();
			if (!types.contains(type)) {
				continue;
			}
			candidates.add(new Candidate(row, type, text(row.getChapter()), text(row.getDifficulty()),
					tags(row.getTag()), AiAssistSupport.plainTitle(titleOf(row), MAX_SUMMARY_CHARS)));
		}
		return candidates;
	}

	/* ====== 任务体：挑选 → 补齐 → 组卷 ====== */

	private AiPaperPickView assemble(AiPaperSpec spec, List<RepoView> repos, List<Candidate> candidates,
			boolean aiSelect, int maxCandidates, Map<String, Double> typeScores, String userId,
			AiJobService.JobContext context) {

		Random random = new Random();
		List<Candidate> pool = new ArrayList<>(candidates);
		Collections.shuffle(pool, random);
		if (pool.size() > maxCandidates) {
			pool = new ArrayList<>(pool.subList(0, maxCandidates));
		}
		List<Candidate> topUp = new ArrayList<>(candidates);
		Collections.shuffle(topUp, random);
		Map<String, List<Candidate>> byType = new LinkedHashMap<>();
		for (Candidate candidate : topUp) {
			byType.computeIfAbsent(candidate.type(), key -> new ArrayList<>()).add(candidate);
		}
		Map<String, Candidate> poolById = new LinkedHashMap<>();
		for (Candidate candidate : pool) {
			poolById.put(candidate.id(), candidate);
		}

		LinkedHashMap<String, String> picks = new LinkedHashMap<>();
		if (aiSelect) {
			picks = select(pool, spec, repos, userId);
		}
		context.progress(60);
		boolean modelPicked = !picks.isEmpty();

		Set<String> used = new HashSet<>();
		List<SurveySchema> questions = new ArrayList<>(spec.getQuestionCount());
		List<AiPaperPickView.Note> notes = new ArrayList<>(spec.getQuestionCount());
		List<String> shortage = new ArrayList<>();
		int missing = 0;
		for (Map.Entry<String, Integer> entry : spec.expectedTypeCount().entrySet()) {
			String type = entry.getKey();
			int need = entry.getValue().intValue();
			if (need <= 0) {
				continue;
			}
			List<Candidate> chosen = new ArrayList<>(need);

			for (String id : picks.keySet()) {
				if (chosen.size() >= need) {
					break;
				}
				Candidate candidate = poolById.get(id);
				if (candidate == null || !type.equals(candidate.type()) || used.contains(candidate.id())) {
					continue;
				}
				chosen.add(candidate);
				used.add(candidate.id());
			}

			if (chosen.size() < need) {
				for (Candidate candidate : byType.getOrDefault(type, List.of())) {
					if (chosen.size() >= need) {
						break;
					}
					if (used.contains(candidate.id())) {
						continue;
					}
					chosen.add(candidate);
					used.add(candidate.id());
				}
			}

			if (chosen.size() < need) {
				missing += need - chosen.size();
				shortage.add(spec.typeLabel(type) + "题库里只有 " + byType.getOrDefault(type, List.of()).size()
						+ " 道，已全部选用");
			}
			double score = scoreOf(spec, typeScores, type);
			for (Candidate candidate : chosen) {
				SurveySchema question = toQuestion(candidate, score);
				if (question == null) {

					missing++;
					continue;
				}
				questions.add(question);
				notes.add(note(candidate, reasonOf(picks.get(candidate.id()), aiSelect, modelPicked)));
			}
		}

		AiPaperJobView.Stats stats = support.summarize(questions);
		AiPaperPickView view = new AiPaperPickView();
		view.setQuestions(questions);
		view.setStats(stats);
		view.setNotes(notes);
		view.setCandidates(Integer.valueOf(pool.size()));
		view.setMissing(Integer.valueOf(missing));
		view.setSummary(summary(repos.size(), pool.size(), stats, countChapters(questions), shortage, missing, aiSelect,
				modelPicked));
		context.progress(90);
		log.info("AI 组卷完成: repos={}, candidates={}, picked={}, missing={}, aiSelect={}, modelPicked={}",
				Integer.valueOf(repos.size()), Integer.valueOf(pool.size()), Integer.valueOf(questions.size()),
				Integer.valueOf(missing), Boolean.valueOf(aiSelect), Boolean.valueOf(modelPicked));
		return view;
	}

	/** 让模型在候选清单里按配比挑题：只返回 id 与理由，题目内容不经过模型的手 */
	private LinkedHashMap<String, String> select(List<Candidate> pool, AiPaperSpec spec, List<RepoView> repos,
			String userId) {
		LinkedHashMap<String, String> vars = new LinkedHashMap<>();
		vars.put("questionCount", String.valueOf(spec.getQuestionCount()));
		vars.put("totalScore", AiAssistSupport.formatScore(spec.getTotalScore()));
		vars.put("typePlan", spec.describeTypeCounts());
		vars.put("difficulty", spec.difficultyLabel());
		vars.put("requirements", StringUtils.hasText(spec.getRequirements()) ? spec.getRequirements() : "无");
		vars.put("repos", repoNames(repos));
		vars.put("chapters", chaptersHint(pool));
		vars.put("candidates", candidateLines(pool));
		AiRequest request = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_PICK, vars))
				.userPrompt("请按上面的题型配比从候选清单里挑题，只输出 JSON。")

				.temperature(Double.valueOf(0.2D))

				.background(true).build();
		AiCompletion completion = support.call(AiUsageService.SCENE_PAPER_PICK, userId, request, true);
		return parsePicks(completion == null ? null : completion.getText(), pool);
	}

	/**
	 * 解析模型挑选结果：只认候选清单里真实存在的 id。
	 *
	 * <p>模型偶尔会编 id、写重复 id、或者干脆返回空数组：<b>编的 id 一律丢弃</b>（宁可少挑一道，
	 * 也不能让不存在的题混进卷子）；一条可用结果都没有时打日志，由上层用随机补齐兜底，
	 * 并在摘要里如实写「模型没有挑出可用题目」。
	 */
	private LinkedHashMap<String, String> parsePicks(String json, List<Candidate> pool) {
		JsonNode root = support.readJson(json, "组卷");
		if (root == null || root.isMissingNode()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "组卷结果解析失败：模型返回了空内容，请重试");
		}
		JsonNode array = root.isArray() ? root : root.path("picks");
		Set<String> known = new HashSet<>();
		for (Candidate candidate : pool) {
			known.add(candidate.id());
		}
		LinkedHashMap<String, String> picks = new LinkedHashMap<>();
		if (array.isArray()) {
			for (JsonNode node : array) {
				String id = node.path("id").asText("").trim();
				if (!known.contains(id) || picks.containsKey(id)) {
					continue;
				}
				String reason = node.path("reason").asText("");
				picks.put(id, StringUtils.hasText(reason) ? AiAssistSupport.oneLine(reason, MAX_REASON_CHARS)
						: "按考点覆盖挑选");
			}
		}
		if (picks.isEmpty()) {
			log.warn("AI 组卷：模型没有返回可用的候选题 id，改用候选里随机抽题");
		}
		return picks;
	}

	/**
	 * 模板 → 可直接写进画布的题目：先深拷贝再补分值。
	 *
	 * <p>为什么必须深拷贝：{@code Template.template} 是 MyBatis 反序列化出来的共享对象，就地改
	 * {@code examScore} 会污染同一个模板在别处的用法（而且下一次组卷会带着上次的分值）。
	 * 只补 {@code examScore} 与空的章节 / 难度，其余字段（题干、选项、答案）原样带过去——
	 * 渲染层的 {@code optionsOf} 对「选项只在 children 里、没有 dataSource」的存量题已有兜底，不需要重建。
	 */
	private SurveySchema toQuestion(Candidate candidate, double score) {
		SurveySchema question;
		try {
			question = support.json().convertValue(candidate.template().getTemplate(), SurveySchema.class);
		}
		catch (Exception e) {
			log.warn("AI 组卷：题目数据损坏已跳过 templateId={}, {}", candidate.id(), AiAssistSupport.messageOf(e));
			return null;
		}
		if (question == null) {
			return null;
		}
		question.setId(candidate.id());
		SurveySchema.Attribute attribute = question.getAttribute() == null ? new SurveySchema.Attribute()
				: question.getAttribute();
		attribute.setExamScore(Double.valueOf(score));
		question.setAttribute(attribute);
		if (!StringUtils.hasText(question.getChapter())) {
			question.setChapter(candidate.template().getChapter());
		}
		if (!StringUtils.hasText(question.getDifficulty())) {
			question.setDifficulty(candidate.template().getDifficulty());
		}
		return question;
	}



	/** 一行一道候选：序号|题目 id|题型|章节|难度|标签|题干摘要（模型只认这一份清单） */
	private static String candidateLines(List<Candidate> pool) {
		StringBuilder text = new StringBuilder();
		for (int index = 0; index < pool.size(); index++) {
			Candidate candidate = pool.get(index);
			text.append(index + 1).append('|').append(candidate.id()).append('|').append(candidate.type())
					.append('|').append(candidate.chapter()).append('|').append(candidate.difficulty()).append('|')
					.append(candidate.tags()).append('|').append(candidate.summary()).append('\n');
		}
		return text.toString();
	}

	private static String repoNames(List<RepoView> repos) {
		StringBuilder text = new StringBuilder();
		for (RepoView repo : repos) {
			if (text.length() > 0) {
				text.append('、');
			}
			text.append(repo != null && StringUtils.hasText(repo.getName()) ? repo.getName().trim() : "未命名题库");
		}
		return text.length() == 0 ? "未命名题库" : text.toString();
	}

	/** 候选题里实际出现过的章节：给模型一个「这次能覆盖到哪」的范围感 */
	private static String chaptersHint(List<Candidate> pool) {
		Set<String> chapters = new LinkedHashSet<>();
		for (Candidate candidate : pool) {
			if (StringUtils.hasText(candidate.template().getChapter())) {
				chapters.add(candidate.template().getChapter().trim());
			}
		}
		if (chapters.isEmpty()) {
			return "不限（这批题没有章节标注）";
		}
		StringBuilder text = new StringBuilder();
		int index = 0;
		for (String chapter : chapters) {
			if (index >= MAX_CHAPTER_HINT) {
				text.append(" 等 ").append(chapters.size()).append(" 个章节");
				break;
			}
			if (index > 0) {
				text.append('、');
			}
			text.append(chapter);
			index++;
		}
		return text.toString();
	}

	private static String summary(int repoCount, int candidates, AiPaperJobView.Stats stats, int chapters,
			List<String> shortage, int missing, boolean aiSelect, boolean modelPicked) {
		int picked = stats.getQuestionCount() == null ? 0 : stats.getQuestionCount().intValue();
		double totalScore = stats.getTotalScore() == null ? 0D : stats.getTotalScore().doubleValue();
		StringBuilder text = new StringBuilder("从 ");
		text.append(repoCount).append(" 个题库的 ").append(candidates).append(" 道候选题里选了 ").append(picked)
				.append(" 题、共 ").append(AiAssistSupport.formatScore(totalScore)).append(" 分");
		text.append(chapters > 0 ? "，覆盖 " + chapters + " 个章节" : "（这批题没有章节标注）");
		if (aiSelect && !modelPicked) {
			text.append("；模型没有挑出可用题目，已按条件随机抽取");
		}
		for (String item : shortage) {
			text.append("；").append(item);
		}
		if (missing > 0) {
			text.append("；还差 ").append(missing).append(" 题（条件太窄，建议放宽章节 / 难度或换题库）");
		}
		return text.append("。").toString();
	}

	/**
	 * 一道题的挑选理由：模型挑的用模型给的理由；模型挑剩的（或压根没让模型挑的）才写「随机」。
	 *

	 * <ul>
	 * <li>模型挑中的 → 用模型理由；</li>
	 * <li>aiSelect=true 但模型没挑够 → 「按条件随机补齐」；</li>
	 * <li>aiSelect=false（或模型一条可用结果都没给）→ 「按条件随机抽取」。</li>
	 * </ul>
	 */
	private static String reasonOf(String modelReason, boolean aiSelect, boolean modelPicked) {
		if (StringUtils.hasText(modelReason)) {
			return modelReason;
		}
		return aiSelect && modelPicked ? "按条件随机补齐" : "按条件随机抽取";
	}

	private static AiPaperPickView.Note note(Candidate candidate, String reason) {
		AiPaperPickView.Note note = new AiPaperPickView.Note();
		note.setQuestionId(candidate.id());
		note.setTitle(candidate.summary());
		note.setReason(reason);
		return note;
	}



	/**
	 * 把题型配比缩放成「加和为 1」再交给 {@link AiPaperSpec}。
	 *
	 * <p>为什么这一步不能让 {@code AiPaperSpec} 自己做：它的 javadoc 写着「比例不要求加和为 1」，
	 * 但 {@code expectedTypeCount()} 是直接拿 {@code ratio × 题量} 取整的——如果前端按百分比传
	 * 40 / 20 / 20 / 20，20 题会被算成 800 题，整张卷子直接崩。这里按总和缩放，
	 * 百分比（40/20/20/20）与小数（0.4/0.2/0.2/0.2）走同一条路。
	 *
	 * <p>非法值（null / 负数 / 与其它值一起出现的不支持题型）原样保留，交给
	 * {@code AiPaperSpec.of} 抛中文错误——在这里静默丢掉只会让老师看到一份「少了一种题型」的卷子。
	 */
	private static Map<String, Double> normalizeRatio(LinkedHashMap<String, Double> typeRatio) {
		Map<String, Double> result = new LinkedHashMap<>();
		if (typeRatio == null || typeRatio.isEmpty()) {
			return result;
		}
		double sum = 0D;
		for (Double value : typeRatio.values()) {
			if (value != null && value.doubleValue() > 0D) {
				sum += value.doubleValue();
			}
		}
		for (Map.Entry<String, Double> entry : typeRatio.entrySet()) {
			Double value = entry.getValue();
			result.put(entry.getKey(), value == null || value.doubleValue() <= 0D || sum <= 0D ? value
					: Double.valueOf(value.doubleValue() / sum));
		}
		return result;
	}

	/** 只有「单一口径」的难度才写进提示词与筛选；多选和 mixed 都按混合处理 */
	private static String resolveDifficulty(List<String> difficulties) {
		if (CollectionUtils.isEmpty(difficulties)) {
			return AiPaperSpec.DIFFICULTY_MIXED;
		}
		return difficulties.size() == 1 ? difficulties.get(0) : AiPaperSpec.DIFFICULTY_MIXED;
	}

	/** easy / medium / hard（也接受直接写「易 / 中 / 难」）→ t_template.difficulty 的取值；mixed 表示不限 */
	private static List<String> toRepoDifficulties(List<String> difficulties) {
		List<String> result = new ArrayList<>();
		for (String difficulty : difficulties) {
			if (AiPaperSpec.DIFFICULTY_MIXED.equalsIgnoreCase(difficulty)) {
				return List.of();
			}
		}
		for (String difficulty : difficulties) {
			String repoValue = DIFFICULTY_TO_REPO.get(difficulty.toLowerCase());
			if (repoValue != null) {
				result.add(repoValue);
			}
			else {

				result.add(difficulty);
			}
		}
		return result;
	}

	/** 题型名大小写不敏感（与 {@code AiPaperSpec} 的配比口径一致）：Radio / radio 都认 */
	private static Map<String, Double> normalizeTypeScores(LinkedHashMap<String, Double> typeScores) {
		Map<String, Double> result = new LinkedHashMap<>();
		if (typeScores == null || typeScores.isEmpty()) {
			return result;
		}
		for (Map.Entry<String, Double> entry : typeScores.entrySet()) {
			SurveySchema.QuestionType type = AiPaperSpec.parseType(entry.getKey());
			Double score = entry.getValue();
			if (type != null && score != null && score.doubleValue() > 0D) {
				result.put(type.name(), score);
			}
		}
		return result;
	}


	private static double scoreOf(AiPaperSpec spec, Map<String, Double> typeScores, String type) {
		Double configured = typeScores.get(type);
		if (configured != null && configured.doubleValue() > 0D) {
			return round1(configured.doubleValue());
		}
		return round1(spec.getTotalScore() / spec.getQuestionCount());
	}

	private static double round1(double value) {
		return Math.round(value * 10D) / 10D;
	}

	private static int countChapters(List<SurveySchema> questions) {
		Set<String> chapters = new HashSet<>();
		for (SurveySchema question : questions) {
			if (question != null && StringUtils.hasText(question.getChapter())) {
				chapters.add(question.getChapter().trim());
			}
		}
		return chapters.size();
	}

	/** 去空、去重、trim（保持原顺序）；null 当空列表 */
	private static List<String> clean(List<String> values) {
		if (CollectionUtils.isEmpty(values)) {
			return List.of();
		}
		Set<String> unique = new LinkedHashSet<>();
		for (String value : values) {
			if (StringUtils.hasText(value)) {
				unique.add(value.trim());
			}
		}
		return new ArrayList<>(unique);
	}

	private static String titleOf(TemplateView row) {
		if (row.getTemplate() != null && StringUtils.hasText(row.getTemplate().getTitle())) {
			return row.getTemplate().getTitle();
		}
		return row.getName();
	}

	private static String tags(String[] tags) {
		if (tags == null || tags.length == 0) {
			return "无标签";
		}
		List<String> values = new ArrayList<>();
		for (String tag : tags) {
			if (StringUtils.hasText(tag)) {
				values.add(tag.trim());
			}
		}
		return values.isEmpty() ? "无标签" : String.join("/", values);
	}

	private static String text(String value) {
		return StringUtils.hasText(value) ? value.trim() : "未标注";
	}







	private record Candidate(TemplateView template, String type, String chapter, String difficulty, String tags,
			String summary) {

		String id() {
			return template.getId();
		}

	}

}
