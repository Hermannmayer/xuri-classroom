package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerExamInfo;
import cn.surveyking.server.domain.dto.AnswerGradeItemView;
import cn.surveyking.server.domain.dto.AnswerGradeRequest;
import cn.surveyking.server.domain.dto.AnswerGradeView;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.mapper.AnswerViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerGrade;
import cn.surveyking.server.domain.model.AnswerItem;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.AnswerGradeMapper;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.AnswerGradeService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import jakarta.validation.ValidationException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 主观题人工批改实现。
 *
 * <p>三条硬规则（都体现在本类的注释里）：
 * <ol>
 * <li>只有 {@code examAnswerMode = manual} 的题允许人工给分，其它题传分直接拒绝；</li>
 * <li>客观题机器分不可覆盖：重算时仍然走 {@link AnswerScoreEvaluator} 原来的 evaluator，
 * 人工分只是作为 manual 题的覆盖值传进去；</li>
 * <li>三处一起更新：{@code t_answer.exam_score}、{@code t_answer.exam_info.question_score}、
 * {@code t_answer_item.score}，否则报表与成绩单会不一致。</li>
 * </ol>
 *
 * <p>这类只依赖 Mapper 与 AnswerAccessGuard，不依赖 AnswerService，避免和
 * {@code AnswerScoringService}（交卷链路）形成构造器循环依赖。
 *
 * @author grading
 */
@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
@Slf4j
public class AnswerGradeServiceImpl implements AnswerGradeService {

	/** 无需批改：卷里没有 manual 题 */
	public static final String GRADE_NONE = "none";

	/** 待批改：卷里有 manual 题，还没全部给分 */
	public static final String GRADE_PENDING = "pending";

	/** 已批改：所有 manual 题都有分 */
	public static final String GRADE_GRADED = "graded";

	private final AnswerMapper answerMapper;

	private final ProjectMapper projectMapper;

	private final AnswerGradeMapper answerGradeMapper;

	private final AnswerItemMapper answerItemMapper;

	private final AnswerViewMapper answerViewMapper;

	private final UserMapper userMapper;

	private final AnswerAccessGuard answerAccessGuard;

	@Override
	public PaginationResponse<AnswerView> listPending(AnswerQuery query) {
		if (query == null || !StringUtils.hasText(query.getProjectId())) {
			throw new ValidationException("待批改列表需要指定项目");
		}
		answerAccessGuard.assertProjectAccess(query.getProjectId());
		// 班级级老师只看自己带的班：项目级老师（所有者/协作者）不受限
		Set<String> classScope = answerAccessGuard.canManageProject(query.getProjectId()) ? Collections.emptySet()
				: answerAccessGuard.readableClassIds(query.getProjectId());
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());
		// 待批改列表只要「谁、什么时候交的、批完没」，不读整卷答案与快照两个大字段
		LambdaQueryWrapper<Answer> wrapper = Wrappers.<Answer>lambdaQuery()
				.select(Answer::getId, Answer::getProjectId, Answer::getAnswererName, Answer::getCreateBy,
						Answer::getGradeStatus, Answer::getGradedBy, Answer::getGradedAt, Answer::getExamScore,
						Answer::getExamInfo, Answer::getTempSave, Answer::getCreateAt, Answer::getIsAnonymous,
						Answer::getAttemptNo)
				.eq(Answer::getProjectId, query.getProjectId())
				// 暂存卷没有最终答案，不能批改
				.eq(Answer::getTempSave, 1)
				.isNotNull(Answer::getAnswer)
				.eq(Answer::getGradeStatus,
						StringUtils.hasText(query.getGradeStatus()) ? query.getGradeStatus() : GRADE_PENDING)
				// 匿名答卷默认不进待批改列表，管理员显式 includeAnonymous 才放开（与答卷列表口径一致）
				.eq(!Boolean.TRUE.equals(query.getIncludeAnonymous()), Answer::getIsAnonymous, false)
				.eq(StringUtils.hasText(query.getClassId()), Answer::getClassId, query.getClassId())
				.in(!classScope.isEmpty(), Answer::getClassId, classScope)
				.in(!CollectionUtils.isEmpty(query.getIds()), Answer::getId, query.getIds())
				.ge(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				.le(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.orderByDesc(Answer::getCreateAt);
		answerMapper.selectPage(page, wrapper);
		List<AnswerView> list = answerViewMapper.toView(page.getRecords());
		fillCreateByName(list);
		return new PaginationResponse<>(page.getTotal(), list);
	}

	@Override
	public AnswerGradeView detail(String answerId) {
		return detail(answerId, false);
	}

	@Override
	public AnswerGradeView detail(String answerId, boolean includeCorrectAnswer) {
		Answer answer = loadAnswer(answerId);
		// 按「这一份答卷」判权：班级级老师不能顺着 projectId 打开别的班的答卷
		answerAccessGuard.assertAnswerAccess(answer);
		SurveySchema schema = resolveSchema(answer);
		Map<String, AnswerGrade> grades = loadGrades(answer.getId());
		List<SurveySchema> questions = schema == null ? Collections.emptyList() : SchemaHelper.flatSurveySchema(schema);

		AnswerGradeView view = new AnswerGradeView();
		view.setAnswerId(answer.getId());
		view.setProjectId(answer.getProjectId());
		view.setAnswererName(answer.getAnswererName());
		view.setAnonymous(answer.getIsAnonymous());
		view.setGradeStatus(StringUtils.hasText(answer.getGradeStatus()) ? answer.getGradeStatus() : GRADE_NONE);
		view.setGradedBy(answer.getGradedBy());
		view.setGradedAt(answer.getGradedAt());
		view.setCreateAt(answer.getCreateAt());
		view.setAttemptNo(answer.getAttemptNo());
		view.setGradedByName(loadUserName(answer.getGradedBy()));
		Project project = projectMapper.selectById(answer.getProjectId());
		view.setProjectName(project == null ? null : project.getName());

		ScoreView score = evaluate(answer, schema, grades);
		view.setExamScore(score.total);
		view.setObjectiveScore(score.objective);
		view.setManualScore(score.manual);
		view.setTotalScore(score.maxScore);
		view.setPendingCount(score.pending);
		// 默认剥掉正确答案：这个接口按权限只给老师用，但默认最小化下发，防止前端顺手渲染到学生可见的位置
		view.setSchema(includeCorrectAnswer || schema == null ? schema : stripCorrectAnswer(schema));
		view.setItems(buildItems(questions, answer.getAnswer(), grades, score.questions, includeCorrectAnswer));
		return view;
	}

	@Override
	public void submit(AnswerGradeRequest request) {
		if (request == null || !StringUtils.hasText(request.getAnswerId())) {
			throw new ValidationException("缺少答卷 id");
		}
		Answer answer = loadAnswer(request.getAnswerId());
		answerAccessGuard.assertAnswerAccess(answer);
		if (!Integer.valueOf(1).equals(answer.getTempSave())) {
			throw new ValidationException("暂存卷不能批改，等学员正式交卷后再批改");
		}
		SurveySchema schema = resolveSchema(answer);
		if (schema == null) {
			throw new ValidationException("这份答卷没有题目快照，无法批改");
		}
		// 只有 manual 题可以给分：客观题的机器分不允许被覆盖
		Map<String, SurveySchema> manualQuestions = manualQuestions(schema);
		if (manualQuestions.isEmpty()) {
			throw new ValidationException("这份答卷没有需要人工评分的题目");
		}
		Map<String, AnswerGradeRequest.Item> items = indexItems(request.getItems());
		if (items.isEmpty()) {
			throw new ValidationException("没有需要保存的分数");
		}
		Map<String, AnswerGrade> existing = loadGrades(answer.getId());
		String grader = SecurityContextUtils.getUserId();
		Date now = new Date();
		for (AnswerGradeRequest.Item item : items.values()) {
			SurveySchema question = manualQuestions.get(item.getQuestionId());
			if (question == null) {
				throw new ValidationException("该题不是人工评分题，客观题分数由系统判定，不能人工改分");
			}
			if (item.getScore() == null) {
				throw new ValidationException("分数不能为空");
			}
			Double maxScore = question.getAttribute() == null ? null : question.getAttribute().getExamScore();
			if (item.getScore() < 0 || (maxScore != null && item.getScore() > maxScore)) {
				throw new ValidationException(
						"分数必须在 0" + (maxScore == null ? "" : " 到 " + maxScore) + " 之间");
			}
			saveGrade(item, answer, existing.get(item.getQuestionId()), grader, now);
		}
		// 落库后重新读一遍批改记录再算分：本次可能是分批保存，前面几题的分也要算进去
		Map<String, AnswerGrade> grades = loadGrades(answer.getId());
		ScoreView score = evaluate(answer, schema, grades);
		// submit=true 且所有 manual 题都有分才算批改完成；否则保持待批改
		boolean graded = Boolean.TRUE.equals(request.getSubmit()) && score.allGraded;
		String status = graded ? GRADE_GRADED : GRADE_PENDING;
		persistScore(answer, score, status, grader, now);
		syncItemScores(answer.getId(), grades, manualQuestions.keySet());
	}

	@Override
	public void reset(String answerId, List<String> questionIds) {
		Answer answer = loadAnswer(answerId);
		answerAccessGuard.assertAnswerAccess(answer);
		SurveySchema schema = resolveSchema(answer);
		if (schema == null) {
			return;
		}
		List<String> targets = questionIds == null ? Collections.emptyList()
				: questionIds.stream().filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		LambdaQueryWrapper<AnswerGrade> wrapper = Wrappers.<AnswerGrade>lambdaQuery()
				.eq(AnswerGrade::getAnswerId, answer.getId());
		if (!targets.isEmpty()) {
			wrapper.in(AnswerGrade::getQuestionId, targets);
		}
		answerGradeMapper.delete(wrapper);

		Map<String, AnswerGrade> grades = loadGrades(answer.getId());
		ScoreView score = evaluate(answer, schema, grades);
		// 撤销后只要还有 manual 题没分，就回到待批改
		String status = score.allGraded && !grades.isEmpty() ? GRADE_GRADED : GRADE_PENDING;
		persistScore(answer, score, status, SecurityContextUtils.getUserId(), new Date());
		syncItemScores(answer.getId(), grades, manualQuestions(schema).keySet());
	}

	@Override
	public void onSubmitted(Answer answer, SurveySchema schema) {
		if (answer == null || !StringUtils.hasText(answer.getId())) {
			return;
		}
		// 只有正式交卷才动批改状态：暂存草稿不影响老师已经打过的分
		if (!Integer.valueOf(1).equals(answer.getTempSave())) {
			return;
		}
		boolean hasManual = schema != null && !manualQuestions(schema).isEmpty();
		String status = hasManual ? GRADE_PENDING : GRADE_NONE;
		answer.setGradeStatus(status);
		answer.setGradedBy(null);
		answer.setGradedAt(null);
		// 重新提交：答卷内容已经变了，旧的人工分不再对应当前答案，整卷作废
		answerGradeMapper.delete(Wrappers.<AnswerGrade>lambdaQuery().eq(AnswerGrade::getAnswerId, answer.getId()));
		// 新建答卷时这一行还不存在（更新 0 行，由随后的 insert 写入 status）；
		// 重新提交时它负责把 graded_by / graded_at 真正清空——updateById 会跳过 null 字段
		answerMapper.update(null, Wrappers.<Answer>lambdaUpdate().eq(Answer::getId, answer.getId())
				.set(Answer::getGradeStatus, status).set(Answer::getGradedBy, null).set(Answer::getGradedAt, null));
	}

	/* ------ 以下为内部实现 ------ */

	private Answer loadAnswer(String answerId) {
		if (!StringUtils.hasText(answerId)) {
			throw new ValidationException("缺少答卷 id");
		}
		Answer answer = answerMapper.selectById(answerId);
		if (answer == null) {
			throw new ValidationException("答卷不存在或已删除");
		}
		return answer;
	}

	/** 判分用的 schema：库里已有的快照优先（随机卷），否则用项目 schema */
	private SurveySchema resolveSchema(Answer answer) {
		if (answer.getSurvey() != null) {
			return answer.getSurvey();
		}
		Project project = projectMapper.selectById(answer.getProjectId());
		return project == null ? null : project.getSurvey();
	}

	/** 卷内所有人工评分题：questionId → schema */
	private Map<String, SurveySchema> manualQuestions(SurveySchema schema) {
		Map<String, SurveySchema> result = new LinkedHashMap<>();
		if (schema == null) {
			return result;
		}
		for (SurveySchema question : SchemaHelper.flatSurveySchema(schema)) {
			if (AnswerScoreEvaluator.isManual(question)) {
				result.put(question.getId(), question);
			}
		}
		return result;
	}

	private Map<String, AnswerGrade> loadGrades(String answerId) {
		Map<String, AnswerGrade> result = new LinkedHashMap<>();
		if (!StringUtils.hasText(answerId)) {
			return result;
		}
		List<AnswerGrade> rows = answerGradeMapper
				.selectList(Wrappers.<AnswerGrade>lambdaQuery().eq(AnswerGrade::getAnswerId, answerId));
		for (AnswerGrade row : rows) {
			result.put(row.getQuestionId(), row);
		}
		return result;
	}

	/** 同一题在一次请求里出现多次时以最后一次为准，避免撞唯一键 */
	private Map<String, AnswerGradeRequest.Item> indexItems(List<AnswerGradeRequest.Item> items) {
		Map<String, AnswerGradeRequest.Item> result = new LinkedHashMap<>();
		if (items == null) {
			return result;
		}
		for (AnswerGradeRequest.Item item : items) {
			if (item == null || !StringUtils.hasText(item.getQuestionId())) {
				throw new ValidationException("题目 id 不能为空");
			}
			result.put(item.getQuestionId(), item);
		}
		return result;
	}

	private void saveGrade(AnswerGradeRequest.Item item, Answer answer, AnswerGrade existing, String grader,
			Date now) {
		if (existing == null) {
			AnswerGrade grade = new AnswerGrade();
			grade.setAnswerId(answer.getId());
			grade.setProjectId(answer.getProjectId());
			grade.setQuestionId(item.getQuestionId());
			grade.setScore(item.getScore());
			grade.setComment(item.getComment());
			grade.setGrader(grader);
			grade.setCreateAt(now);
			grade.setUpdateAt(now);
			answerGradeMapper.insert(grade);
			return;
		}
		// 走 UpdateWrapper 显式设置字段：评语允许被清空（updateById 会跳过 null）
		answerGradeMapper.update(null, Wrappers.<AnswerGrade>lambdaUpdate().eq(AnswerGrade::getId, existing.getId())
				.set(AnswerGrade::getScore, item.getScore()).set(AnswerGrade::getComment, item.getComment())
				.set(AnswerGrade::getGrader, grader).set(AnswerGrade::getUpdateAt, now));
	}

	/**
	 * 重算整卷：机器分照旧走 evaluator，人工分作为 manual 题的覆盖值传进去。
	 *
	 * <p>与 {@code AnswerScoringService#computeExamScore} 用的是同一个评估器，保证
	 * 「批改后的 exam_score」与「学生再交一次卷」算出来的口径一致。
	 */
	private ScoreView evaluate(Answer answer, SurveySchema schema, Map<String, AnswerGrade> grades) {
		ScoreView view = new ScoreView();
		if (schema == null) {
			return view;
		}
		LinkedHashMap<String, Object> answerMap = answer.getAnswer() == null ? new LinkedHashMap<>()
				: answer.getAnswer();
		Map<String, Double> overrides = new HashMap<>();
		grades.forEach((questionId, grade) -> {
			if (grade.getScore() != null) {
				overrides.put(questionId, grade.getScore());
			}
		});
		AnswerScoreEvaluator evaluator = new AnswerScoreEvaluator(schema, answerMap, overrides);
		view.total = evaluator.eval();
		view.questions = evaluator.getQuestionScore();
		Set<String> manualQuestionIds = new HashSet<>(manualQuestions(schema).keySet());
		boolean allGraded = true;
		for (SurveySchema question : SchemaHelper.flatSurveySchema(schema)) {
			Double maxScore = question.getAttribute() == null ? null : question.getAttribute().getExamScore();
			if (maxScore != null) {
				view.maxScore += maxScore;
			}
			Double got = view.questions.get(question.getId());
			if (manualQuestionIds.contains(question.getId())) {
				view.manual += got == null ? .0 : got;
				if (!grades.containsKey(question.getId())) {
					allGraded = false;
					view.pending++;
				}
			}
			else {
				view.objective += got == null ? .0 : got;
			}
		}
		view.allGraded = allGraded && !manualQuestionIds.isEmpty();
		return view;
	}

	/**
	 * 落库总分：exam_score / exam_info.question_score / grade_status / graded_by / graded_at。
	 *
	 * <p>用 updateById（实体 + 类型处理器）而不是 UpdateWrapper.set，因为 exam_info 是 JSON 字段，
	 * 走 wrapper 的 set 不会应用 Jackson3TypeHandler。
	 */
	private void persistScore(Answer answer, ScoreView score, String status, String grader, Date now) {
		AnswerExamInfo examInfo = answer.getExamInfo() == null ? new AnswerExamInfo() : answer.getExamInfo();
		examInfo.setQuestionScore(score.questions);
		answer.setExamScore(score.total);
		answer.setExamInfo(examInfo);
		answer.setGradeStatus(status);
		answer.setGradedBy(grader);
		answer.setGradedAt(now);
		answerMapper.updateById(answer);
	}

	private void syncItemScores(String answerId, Map<String, AnswerGrade> grades, Set<String> manualQuestionIds) {
		if (CollectionUtils.isEmpty(manualQuestionIds)) {
			return;
		}
		List<AnswerItem> rows = answerItemMapper.selectList(Wrappers.<AnswerItem>lambdaQuery()
				.eq(AnswerItem::getAnswerId, answerId).in(AnswerItem::getQuestionId, manualQuestionIds));
		Map<String, List<AnswerItem>> rowsByQuestion = new HashMap<>();
		for (AnswerItem row : rows) {
			rowsByQuestion.computeIfAbsent(row.getQuestionId(), key -> new ArrayList<>()).add(row);
		}
		for (String questionId : manualQuestionIds) {
			List<AnswerItem> items = rowsByQuestion.get(questionId);
			if (items == null || items.isEmpty()) {
				continue;
			}
			AnswerGrade grade = grades.get(questionId);
			if (grade == null || grade.getScore() == null) {
				// 撤销批改 / 还没批改：把投影里的分数清空，否则统计会一直用上一次的旧分
				answerItemMapper.update(null, Wrappers.<AnswerItem>lambdaUpdate()
						.eq(AnswerItem::getAnswerId, answerId).eq(AnswerItem::getQuestionId, questionId)
						.set(AnswerItem::getScore, null));
				continue;
			}
			// 一题一行最常见（简答/多行文本）；多空题只有第一行带分，保证按 question_id 求和不会重复计分
			items.sort((left, right) -> {
				String a = left.getOptionId() == null ? "" : left.getOptionId();
				String b = right.getOptionId() == null ? "" : right.getOptionId();
				return a.compareTo(b);
			});
			for (int index = 0; index < items.size(); index++) {
				AnswerItem patch = new AnswerItem();
				patch.setId(items.get(index).getId());
				patch.setScore(index == 0 ? grade.getScore() : .0);
				answerItemMapper.updateById(patch);
			}
		}
	}

	private List<AnswerGradeItemView> buildItems(List<SurveySchema> questions, LinkedHashMap<String, Object> answer,
			Map<String, AnswerGrade> grades, LinkedHashMap<String, Double> machineScores,
			boolean includeCorrectAnswer) {
		List<AnswerGradeItemView> items = new ArrayList<>(questions.size());
		int number = 0;
		for (SurveySchema question : questions) {
			number++;
			AnswerGradeItemView item = new AnswerGradeItemView();
			item.setQuestionId(question.getId());
			item.setType(question.getType() == null ? null : question.getType().name());
			item.setTitle(question.getTitle());
			item.setNumber(number);
			item.setRichTitle(question.getAttribute() == null ? null : question.getAttribute().getRichTitle());
			item.setMaxScore(question.getAttribute() == null ? null : question.getAttribute().getExamScore());
			item.setAnswer(answer == null ? null : answer.get(question.getId()));
			boolean manual = AnswerScoreEvaluator.isManual(question);
			item.setEditable(manual);
			if (manual) {
				AnswerGrade grade = grades.get(question.getId());
				// 没批改过就是 null：前端按「待批改」展示，不能当 0 分
				item.setScore(grade == null ? null : grade.getScore());
				item.setComment(grade == null ? null : grade.getComment());
			}
			else {
				item.setScore(machineScores.get(question.getId()));
			}
			if (includeCorrectAnswer) {
				item.setCorrectAnswer(correctAnswerOf(question));
				item.setAnalysis(question.getAttribute() == null ? null : question.getAttribute().getExamAnalysis());
			}
			items.add(item);
		}
		return items;
	}

	/** 标准答案：选择题/填空题的正确答案可能挂在子选项上，取第一个非空的 */
	private String correctAnswerOf(SurveySchema question) {
		if (question.getAttribute() != null && StringUtils.hasText(question.getAttribute().getExamCorrectAnswer())) {
			return question.getAttribute().getExamCorrectAnswer();
		}
		if (question.getChildren() == null) {
			return null;
		}
		for (SurveySchema child : question.getChildren()) {
			if (child.getAttribute() != null && StringUtils.hasText(child.getAttribute().getExamCorrectAnswer())) {
				return child.getAttribute().getExamCorrectAnswer();
			}
		}
		return null;
	}

	/** 深拷贝后剥掉正确答案，不动项目 schema / 答卷快照本身 */
	private SurveySchema stripCorrectAnswer(SurveySchema schema) {
		SurveySchema copy = schema.deepCopy();
		SchemaHelper.ignoreAttributes(copy, "examCorrectAnswer");
		return copy;
	}

	private String loadUserName(String userId) {
		if (!StringUtils.hasText(userId)) {
			return null;
		}
		User user = userMapper.selectById(userId);
		return user == null ? null : user.getName();
	}

	/** 与 AnswerServiceImpl#fillCreateByName 同一口径：列表要显示答卷人姓名 */
	private void fillCreateByName(List<AnswerView> views) {
		if (CollectionUtils.isEmpty(views)) {
			return;
		}
		Set<String> userIds = views.stream().filter(Objects::nonNull).map(AnswerView::getCreateBy)
				.filter(StringUtils::hasText).collect(Collectors.toSet());
		if (userIds.isEmpty()) {
			return;
		}
		Map<String, String> userNames = userMapper.selectBatchIds(userIds).stream()
				.filter(user -> user != null && StringUtils.hasText(user.getName()))
				.collect(Collectors.toMap(User::getId, User::getName, (first, second) -> first));
		views.forEach(view -> {
			if (view != null && StringUtils.hasText(view.getCreateBy())) {
				view.setCreateByName(userNames.get(view.getCreateBy()));
			}
		});
	}

	/** 一次批改/撤销算出来的分数快照 */
	private static class ScoreView {

		private Double total = .0;

		private Double objective = .0;

		private Double manual = .0;

		private Double maxScore = .0;

		private int pending;

		private boolean allGraded;

		private LinkedHashMap<String, Double> questions = new LinkedHashMap<>();

	}

}
