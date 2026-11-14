package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.ComposeCreateResult;
import cn.surveyking.server.domain.dto.ComposePickRequest;
import cn.surveyking.server.domain.dto.ComposePlan;
import cn.surveyking.server.domain.dto.ComposeRequest;
import cn.surveyking.server.domain.dto.ComposeStats;
import cn.surveyking.server.domain.dto.ComposeVariant;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.dto.SurveySchema.QuestionType;
import cn.surveyking.server.domain.model.Template;
import cn.surveyking.server.mapper.TemplateMapper;
import cn.surveyking.server.service.ComposeService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.RepoService;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

/** 组卷实现：范围筛选 → 规则分配 → 多套去重 → 落库。 */
@Service
@RequiredArgsConstructor
public class ComposeServiceImpl implements ComposeService {

	private static final ObjectMapper MAPPER = new ObjectMapper();

	private static final List<QuestionType> DEFAULT_TYPES = Arrays.asList(QuestionType.Radio,
			QuestionType.Checkbox, QuestionType.Judge, QuestionType.FillBlank, QuestionType.Textarea);

	private static final Map<QuestionType, String> LABELS = new LinkedHashMap<>();

	static {
		LABELS.put(QuestionType.Radio, "单选题");
		LABELS.put(QuestionType.Checkbox, "多选题");
		LABELS.put(QuestionType.Judge, "判断题");
		LABELS.put(QuestionType.FillBlank, "填空题");
		LABELS.put(QuestionType.Textarea, "简答题");
	}

	private static final String[] NUMERALS = { "一", "二", "三", "四", "五", "六", "七", "八", "九", "十" };

	private final TemplateMapper templateMapper;

	private final RepoService repoService;

	private final ProjectService projectService;

	@Override
	public ComposeStats stats(List<String> repoIds) {
		ComposeStats stats = new ComposeStats();
		if (repoIds == null || repoIds.isEmpty()) {
			return stats;
		}
		List<Template> templates = templateMapper
				.selectList(Wrappers.<Template>lambdaQuery().in(Template::getRepoId, repoIds));
		for (Template template : templates) {
			stats.setTotal(stats.getTotal() + 1);
			String type = label(template.getQuestionType());
			stats.getByType().merge(type, 1, Integer::sum);
			stats.getByChapter().merge(text(template.getChapter(), "未设置"), 1, Integer::sum);
			stats.getByDifficulty().merge(text(template.getDifficulty(), "未设置"), 1, Integer::sum);
		}
		return stats;
	}

	@Override
	public ComposePlan plan(ComposeRequest request) {
		List<String> repoIds = request.getRepoIds();
		if (repoIds == null || repoIds.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请先选择题库");
		}
		repoIds.forEach(repoService::getRpo);
		List<QuestionType> types = request.getTypes() == null || request.getTypes().isEmpty() ? DEFAULT_TYPES
				: request.getTypes();
		List<Template> all = loadCandidates(request, types);
		if (all.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "当前筛选条件下没有可用题目");
		}

		int sets = request.getSets() == null ? 1 : Math.max(1, Math.min(50, request.getSets()));
		long seed = request.getSeed() != null ? request.getSeed() : new Random().nextInt(1_000_000_000);
		if ("split".equalsIgnoreCase(request.getMode())) {
			return planSplit(request, types, all, sets, seed);
		}
		Map<QuestionType, Integer> needs = resolveNeeds(request, types, all);
		Map<QuestionType, List<Template>> pools = buildPools(all, types);
		Map<QuestionType, List<Template>> ordered = new LinkedHashMap<>();
		Random orderRandom = new Random(seed);
		for (QuestionType type : types) {
			ordered.put(type, weightedOrder(pools.get(type), request.getDifficultyWeights(), orderRandom));
		}

		ComposePlan plan = new ComposePlan();
		plan.setName(text(request.getName(), "组卷试卷"));
		plan.setSeed(seed);
		plan.setSets(sets);

		Map<QuestionType, Integer> cursor = new HashMap<>();
		Set<String> previousIds = new HashSet<>();
		for (int seq = 1; seq <= sets; seq++) {
			Random random = new Random(seed + seq * 7919L);
			ComposeVariant variant = buildVariant(request, types, needs, pools, ordered, cursor,
					Boolean.TRUE.equals(request.getUniqueAcrossPapers()), random, plan.getWarnings());
			variant.setSeq(seq);
			if (!previousIds.isEmpty()) {
				int repeated = 0;
				for (String id : variant.getTemplateIds()) {
					if (previousIds.contains(id)) {
						repeated++;
					}
				}
				variant.setRepeated(repeated);
			}
			previousIds = new HashSet<>(variant.getTemplateIds());
			plan.getVariants().add(variant);
		}
		return plan;
	}

	/**
	 * 整套拆分：题库里符合条件的题全部用上，按题型均匀拆成 N 套，套间不重复。
	 */
	private ComposePlan planSplit(ComposeRequest request, List<QuestionType> types, List<Template> all, int sets,
			long seed) {
		if (all.size() < sets) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					"题量不足：共 " + all.size() + " 题，拆不出 " + sets + " 套");
		}
		ComposePlan plan = new ComposePlan();
		plan.setName(text(request.getName(), "组卷试卷"));
		plan.setSeed(seed);
		plan.setSets(sets);
		plan.getWarnings().add("整套拆分：共 " + all.size() + " 题，均分到 " + sets + " 套，套间不重复");

		Map<QuestionType, List<Template>> pools = buildPools(all, types);
		Map<QuestionType, List<Template>> shuffled = new LinkedHashMap<>();
		for (QuestionType type : types) {
			List<Template> pool = new ArrayList<>(pools.get(type));
			Collections.shuffle(pool, new Random(seed + type.ordinal() * 97L));
			shuffled.put(type, pool);
		}

		for (int seq = 1; seq <= sets; seq++) {
			ComposeVariant variant = new ComposeVariant();
			variant.setSeq(seq);
			SurveySchema survey = new SurveySchema();
			survey.setId(IdWorker.getIdStr());
			survey.setTitle(plan.getName());
			survey.setType(QuestionType.Survey);
			survey.setAttribute(new SurveySchema.Attribute());
			survey.setChildren(new ArrayList<>());
			List<String> templateIds = new ArrayList<>();
			int numeralIndex = 0;
			for (QuestionType type : types) {
				List<Template> pool = shuffled.get(type);
				List<Template> picked = new ArrayList<>();
				for (int i = seq - 1; i < pool.size(); i += sets) {
					picked.add(pool.get(i));
				}
				if (picked.isEmpty()) {
					continue;
				}
				double score = scoreOf(request.getScores(), type);
				SurveySchema group = new SurveySchema();
				group.setId(IdWorker.getIdStr());
				group.setTitle(groupTitle(numeralIndex++, type, score));
				group.setType(QuestionType.QuestionSet);
				group.setChildren(new ArrayList<>());
				for (Template template : picked) {
					SurveySchema question = toQuestion(template, score);
					group.getChildren().add(question);
					templateIds.add(template.getId());
					variant.setTotal(variant.getTotal() + 1);
					variant.setScore(variant.getScore() + score);
					variant.getByType().merge(label(type), 1, Integer::sum);
					variant.getByDifficulty().merge(text(question.getDifficulty(), "未设置"), 1, Integer::sum);
				}
				survey.getChildren().add(group);
			}
			if (variant.getTotal() == 0) {
				continue;
			}
			variant.setSurvey(survey);
			variant.setTemplateIds(templateIds);
			plan.getVariants().add(variant);
		}
		if (plan.getVariants().isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "没有可拆分的题目");
		}
		return plan;
	}

	@Override
	public ComposeCreateResult create(ComposeRequest request) {
		ComposePlan plan = plan(request);
		List<String> projectIds = new ArrayList<>();
		for (ComposeVariant variant : plan.getVariants()) {
			ProjectRequest project = new ProjectRequest();
			project.setName(plan.getName() + "-" + variantSuffix(variant.getSeq()));
			project.setMode(ProjectModeEnum.exam);
			project.setSurvey(variant.getSurvey());
			project.setSetting(new ProjectSetting());
			project.setCategory(request.getCategory());
			project.setParentId(request.getParentId());
			ProjectView view = projectService.addProject(project);
			variant.setProjectId(view.getId());
			projectIds.add(view.getId());
		}
		ComposeCreateResult result = new ComposeCreateResult();
		result.setProjectIds(projectIds);
		result.setPlan(plan);
		return result;
	}

	@Override
	public List<SurveySchema> pick(ComposePickRequest request) {
		List<String> repoIds = request.getRepoIds();
		if (repoIds == null || repoIds.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请先选择题库");
		}
		repoIds.forEach(repoService::getRpo);
		ComposeRequest query = new ComposeRequest();
		query.setRepoIds(repoIds);
		query.setTypes(request.getTypes());
		query.setChapters(request.getChapters());
		query.setDifficulties(request.getDifficulties());
		query.setTags(request.getTags());
		query.setKeyword(request.getKeyword());
		List<Template> all = loadCandidates(query, request.getTypes() == null || request.getTypes().isEmpty()
				? DEFAULT_TYPES : request.getTypes());
		Set<String> excluded = new HashSet<>(request.getExcludeIds() == null ? Collections.emptyList()
				: request.getExcludeIds());
		all = all.stream().filter(template -> !excluded.contains(template.getId())).collect(Collectors.toList());
		if (all.isEmpty()) {
			return Collections.emptyList();
		}
		long seed = request.getSeed() != null ? request.getSeed() : new Random().nextInt(1_000_000_000);
		Random random = new Random(seed);
		List<QuestionType> types = request.getTypes() == null || request.getTypes().isEmpty() ? DEFAULT_TYPES
				: request.getTypes();
		List<SurveySchema> questions = new ArrayList<>();
		Map<String, Integer> counts = request.getCounts();
		if (counts != null && !counts.isEmpty()) {
			Map<QuestionType, List<Template>> pools = buildPools(all, types);
			boolean sequential = "sequential".equalsIgnoreCase(request.getMode());
			for (QuestionType type : types) {
				int need = Math.max(0, counts.getOrDefault(type.name(), 0));
				if (need <= 0) {
					continue;
				}
				List<Template> pool = new ArrayList<>(pools.get(type));
				if (sequential) {
					pool.sort(Comparator.comparing(template -> text(template.getSerialNo(), template.getId())));
				}
				else {
					Collections.shuffle(pool, random);
				}
				for (int i = 0; i < Math.min(need, pool.size()); i++) {
					questions.add(toQuestion(pool.get(i), scoreOf(request.getScores(), type)));
				}
			}
			return questions;
		}
		Collections.shuffle(all, random);
		int count = request.getCount() == null ? all.size() : Math.max(1, request.getCount());
		for (int i = 0; i < Math.min(count, all.size()); i++) {
			questions.add(toQuestion(all.get(i), scoreOf(request.getScores(), all.get(i).getQuestionType())));
		}
		return questions;
	}

	// ── 选卷 ──────────────────────────────────────────────────────

	private ComposeVariant buildVariant(ComposeRequest request, List<QuestionType> types,
			Map<QuestionType, Integer> needs, Map<QuestionType, List<Template>> pools,
			Map<QuestionType, List<Template>> ordered, Map<QuestionType, Integer> cursor, boolean unique,
			Random random, List<String> warnings) {
		ComposeVariant variant = new ComposeVariant();
		SurveySchema survey = new SurveySchema();
		survey.setId(IdWorker.getIdStr());
		survey.setTitle(text(request.getName(), "组卷试卷"));
		survey.setType(QuestionType.Survey);
		survey.setAttribute(new SurveySchema.Attribute());
		survey.setChildren(new ArrayList<>());

		Set<String> used = new LinkedHashSet<>();
		List<String> templateIds = new ArrayList<>();
		int numeralIndex = 0;
		for (QuestionType type : types) {
			int need = needs.getOrDefault(type, 0);
			if (need <= 0) {
				continue;
			}
			List<Template> source = unique ? ordered.get(type) : weightedOrder(pools.get(type),
					request.getDifficultyWeights(), random);
			List<Template> picked = new ArrayList<>();
			if ("sequential".equalsIgnoreCase(request.getMode())) {
				picked = takeSequential(source, request, type, need);
			}
			else {
				int start = unique ? cursor.getOrDefault(type, 0) : 0;
				picked = take(source, start, need, used, request, warnings, type);
				if (unique) {
					cursor.put(type, start + picked.size());
				}
			}
			if (picked.isEmpty()) {
				continue;
			}
			double score = scoreOf(request.getScores(), type);
			SurveySchema group = new SurveySchema();
			group.setId(IdWorker.getIdStr());
			group.setTitle(groupTitle(numeralIndex++, type, score));
			group.setType(QuestionType.QuestionSet);
			group.setChildren(new ArrayList<>());
			for (Template template : picked) {
				SurveySchema question = toQuestion(template, score);
				group.getChildren().add(question);
				used.add(template.getId());
				templateIds.add(template.getId());
				variant.setTotal(variant.getTotal() + 1);
				variant.setScore(variant.getScore() + score);
				variant.getByType().merge(label(type), 1, Integer::sum);
				variant.getByDifficulty().merge(text(question.getDifficulty(), "未设置"), 1, Integer::sum);
			}
			survey.getChildren().add(group);
		}
		variant.setSurvey(survey);
		variant.setTemplateIds(templateIds);
		List<QuestionType> order = types;
		survey.getChildren().sort(Comparator.comparingInt(group -> order.indexOf(group.getType())));
		if (variant.getTotal() == 0) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "组卷结果为空，请检查题量与筛选条件");
		}
		return variant;
	}

	private List<Template> take(List<Template> source, int start, int need, Set<String> used, ComposeRequest request,
			List<String> warnings, QuestionType type) {
		List<Template> picked = new ArrayList<>();
		if (source == null) {
			return picked;
		}
		for (int i = start; i < source.size() && picked.size() < need; i++) {
			Template template = source.get(i);
			if (used.contains(template.getId())) {
				continue;
			}
			picked.add(template);
		}
		if (picked.size() >= need) {
			return picked;
		}
		String policy = request.getShortagePolicy() == null ? "less" : request.getShortagePolicy();
		if ("error".equalsIgnoreCase(policy)) {
			throw new ErrorCodeException(ErrorCode.FileParseError,
					label(type) + "题量不足：需要 " + need + " 题，只有 " + picked.size() + " 题");
		}
		if ("reuse".equalsIgnoreCase(policy) && !source.isEmpty()) {
			for (int i = 0; picked.size() < need; i++) {
				picked.add(source.get(i % source.size()));
			}
			warnings.add(label(type) + "题量不足，已复用旧题补足 " + need + " 题");
		}
		else {
			warnings.add(label(type) + "题量不足，少出 " + (need - picked.size()) + " 题");
		}
		return picked;
	}

	private List<Template> takeSequential(List<Template> source, ComposeRequest request, QuestionType type,
			int need) {
		List<Template> picked = new ArrayList<>();
		int start = request.getRangeStart().getOrDefault(type.name(), 1);
		int end = request.getRangeEnd().getOrDefault(type.name(), start + need - 1);
		List<Template> ordered = new ArrayList<>(source);
		ordered.sort(Comparator.comparing(template -> text(template.getSerialNo(), template.getId())));
		for (int i = Math.max(0, start - 1); i < Math.min(ordered.size(), end) && picked.size() < need; i++) {
			picked.add(ordered.get(i));
		}
		return picked;
	}

	private Map<QuestionType, Integer> resolveNeeds(ComposeRequest request, List<QuestionType> types,
			List<Template> all) {
		Map<QuestionType, Integer> needs = new LinkedHashMap<>();
		String mode = request.getMode() == null ? "random" : request.getMode();
		if ("ratio".equalsIgnoreCase(mode)) {
			int total = request.getTotalQuestions() == null ? 0 : request.getTotalQuestions();
			int sum = 0;
			for (QuestionType type : types) {
				sum += Math.max(0, request.getRatios().getOrDefault(type.name(), 0));
			}
			if (total <= 0 || sum <= 0) {
				throw new ErrorCodeException(ErrorCode.FileParseError, "按比例组卷需要填写总题数和比例");
			}
			int assigned = 0;
			List<Map.Entry<QuestionType, Double>> remainders = new ArrayList<>();
			for (QuestionType type : types) {
				double exact = total * (double) Math.max(0, request.getRatios().getOrDefault(type.name(), 0)) / sum;
				int count = (int) Math.floor(exact);
				needs.put(type, count);
				assigned += count;
				remainders.add(new java.util.AbstractMap.SimpleEntry<>(type, exact - count));
			}
			remainders.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
			for (int i = 0; assigned < total && i < remainders.size(); i++, assigned++) {
				needs.merge(remainders.get(i).getKey(), 1, Integer::sum);
			}
		}
		else if ("sequential".equalsIgnoreCase(mode)) {
			for (QuestionType type : types) {
				int start = request.getRangeStart().getOrDefault(type.name(), 1);
				int end = request.getRangeEnd().getOrDefault(type.name(), start);
				needs.put(type, Math.max(0, end - start + 1));
			}
		}
		else {
			for (QuestionType type : types) {
				needs.put(type, Math.max(0, request.getCounts().getOrDefault(type.name(), 0)));
			}
		}
		int totalNeeds = needs.values().stream().mapToInt(Integer::intValue).sum();
		if (totalNeeds <= 0) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "请至少给一种题型配置题数");
		}
		return needs;
	}

	/** 按难度权重做加权随机排序（指数竞赛法），题库不够时自然退化为整池随机 */
	private List<Template> weightedOrder(List<Template> pool, Map<String, Double> weights, Random random) {
		List<Template> copy = pool == null ? new ArrayList<>() : new ArrayList<>(pool);
		if (copy.isEmpty()) {
			return copy;
		}
		if (weights == null || weights.isEmpty()) {
			Collections.shuffle(copy, random);
			return copy;
		}
		Map<Template, Double> keys = new HashMap<>();
		for (Template template : copy) {
			double weight = weights.getOrDefault(text(template.getDifficulty(), ""), 1D);
			if (weight <= 0) {
				weight = 0.0001;
			}
			keys.put(template, -Math.log(Math.max(1e-9, random.nextDouble())) / weight);
		}
		copy.sort(Comparator.comparingDouble(keys::get));
		return copy;
	}

	private List<Template> loadCandidates(ComposeRequest request, List<QuestionType> types) {
		List<Template> templates = templateMapper.selectList(Wrappers.<Template>lambdaQuery()
				.in(Template::getRepoId, request.getRepoIds())
				.in(!types.isEmpty(), Template::getQuestionType, types)
				.in(request.getChapters() != null && !request.getChapters().isEmpty(), Template::getChapter,
						request.getChapters())
				.in(request.getDifficulties() != null && !request.getDifficulties().isEmpty(), Template::getDifficulty,
						request.getDifficulties())
				.like(StringUtils.hasText(request.getKeyword()), Template::getName, request.getKeyword()));
		if (request.getTags() == null || request.getTags().isEmpty()) {
			return templates;
		}
		return templates.stream().filter(template -> {
			List<String> tags = template.getTag() == null ? Collections.emptyList() : Arrays.asList(template.getTag());
			return request.getTags().stream().anyMatch(tags::contains);
		}).collect(Collectors.toList());
	}

	private Map<QuestionType, List<Template>> buildPools(List<Template> all, List<QuestionType> types) {
		Map<QuestionType, List<Template>> pools = new LinkedHashMap<>();
		for (QuestionType type : types) {
			pools.put(type, new ArrayList<>());
		}
		for (Template template : all) {
			if (template.getQuestionType() == null) {
				continue;
			}
			List<Template> list = pools.get(template.getQuestionType());
			if (list != null) {
				list.add(template);
			}
		}
		return pools;
	}

	// ── 题目转换 ──────────────────────────────────────────────────

	private SurveySchema toQuestion(Template template, double score) {
		SurveySchema schema;
		try {
			schema = MAPPER.convertValue(template.getTemplate(), SurveySchema.class);
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "题目数据损坏：" + template.getName());
		}
		if (schema == null) {
			throw new ErrorCodeException(ErrorCode.FileParseError, "题目数据为空：" + template.getName());
		}
		schema.setId(template.getId());
		SurveySchema.Attribute attribute = schema.getAttribute() == null ? new SurveySchema.Attribute()
				: schema.getAttribute();
		attribute.setExamScore(score);
		attribute.setRequired(true);
		schema.setAttribute(attribute);
		if (!StringUtils.hasText(schema.getChapter())) {
			schema.setChapter(template.getChapter());
		}
		if (!StringUtils.hasText(schema.getDifficulty())) {
			schema.setDifficulty(template.getDifficulty());
		}
		if (schema.getType() == QuestionType.Radio || schema.getType() == QuestionType.Checkbox
				|| schema.getType() == QuestionType.Judge) {
			rebuildDataSource(schema);
		}
		return schema;
	}

	private void rebuildDataSource(SurveySchema question) {
		if (question.getChildren() == null || question.getChildren().isEmpty()) {
			return;
		}
		List<SurveySchema.DataSource> sources = new ArrayList<>();
		for (SurveySchema child : question.getChildren()) {
			if (!StringUtils.hasText(child.getTitle())) {
				continue;
			}
			SurveySchema.DataSource source = new SurveySchema.DataSource();
			source.setLabel(child.getTitle());
			source.setValue(child.getId());
			sources.add(source);
		}
		question.setDataSource(sources.isEmpty() ? null : sources);
	}

	private double scoreOf(Map<String, Double> scores, QuestionType type) {
		if (scores == null) {
			return 5D;
		}
		Double score = scores.get(type.name());
		return score == null || score <= 0 ? 5D : score;
	}

	private String groupTitle(int index, QuestionType type, double score) {
		String numeral = index < NUMERALS.length ? NUMERALS[index] : String.valueOf(index + 1);
		return numeral + "、" + label(type) + "（每题 " + trimScore(score) + " 分）";
	}

	private String trimScore(double score) {
		return score == Math.floor(score) ? String.valueOf((int) score) : String.valueOf(score);
	}

	private String variantSuffix(int seq) {
		return seq <= 26 ? String.valueOf((char) ('A' + seq - 1)) : String.valueOf(seq);
	}

	private String label(QuestionType type) {
		return type == null ? "未知" : LABELS.getOrDefault(type, type.name());
	}

	private String text(String value, String fallback) {
		return StringUtils.hasText(value) ? value : fallback;
	}

}
