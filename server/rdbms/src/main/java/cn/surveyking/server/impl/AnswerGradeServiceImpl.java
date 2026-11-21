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


















@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
@Slf4j
public class AnswerGradeServiceImpl implements AnswerGradeService {


	public static final String GRADE_NONE = "none";


	public static final String GRADE_PENDING = "pending";


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

		Set<String> classScope = answerAccessGuard.canManageProject(query.getProjectId()) ? Collections.emptySet()
				: answerAccessGuard.readableClassIds(query.getProjectId());
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());

		LambdaQueryWrapper<Answer> wrapper = Wrappers.<Answer>lambdaQuery()
				.select(Answer::getId, Answer::getProjectId, Answer::getAnswererName, Answer::getCreateBy,
						Answer::getGradeStatus, Answer::getGradedBy, Answer::getGradedAt, Answer::getExamScore,
						Answer::getExamInfo, Answer::getTempSave, Answer::getCreateAt, Answer::getIsAnonymous,
						Answer::getAttemptNo)
				.eq(Answer::getProjectId, query.getProjectId())

				.eq(Answer::getTempSave, 1)
				.isNotNull(Answer::getAnswer)
				.eq(Answer::getGradeStatus,
						StringUtils.hasText(query.getGradeStatus()) ? query.getGradeStatus() : GRADE_PENDING)

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

		answerAccessGuard.assertAnswerAccess(answer);
		SurveySchema schema = includeCorrectAnswer ? resolveSchemaWithAnswers(answer) : resolveSchema(answer);
		Map<String, AnswerGrade> grades = loadGrades(answer.getId());
		List<SurveySchema> questions = schema == null ? Collections.emptyList() : SchemaHelper.flatSurveySchema(schema);

		AnswerGradeView view = new AnswerGradeView();
		view.setAnswerId(answer.getId());
		view.setProjectId(answer.getProjectId());
		view.setAnswererName(answer.getAnswererName());
		view.setAnonymous(answer.getIsAnonymous());
		view.setGradeStatus(StringUtils.hasText(answer.getGradeStatus()) ? answer.getGradeStatus() : GRADE_NONE);


		if (GRADE_PENDING.equals(view.getGradeStatus()) && schema != null && manualQuestions(schema).isEmpty()) {
			answerMapper.update(null, Wrappers.<Answer>lambdaUpdate().eq(Answer::getId, answer.getId())
					.set(Answer::getGradeStatus, GRADE_NONE));
			view.setGradeStatus(GRADE_NONE);
		}
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

		Map<String, AnswerGrade> grades = loadGrades(answer.getId());
		ScoreView score = evaluate(answer, schema, grades);

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

		String status = score.allGraded && !grades.isEmpty() ? GRADE_GRADED : GRADE_PENDING;
		persistScore(answer, score, status, SecurityContextUtils.getUserId(), new Date());
		syncItemScores(answer.getId(), grades, manualQuestions(schema).keySet());
	}

	@Override
	public void onSubmitted(Answer answer, SurveySchema schema) {
		if (answer == null || !StringUtils.hasText(answer.getId())) {
			return;
		}

		if (!Integer.valueOf(1).equals(answer.getTempSave())) {
			return;
		}
		boolean hasManual = schema != null && !manualQuestions(schema).isEmpty();
		String status = hasManual ? GRADE_PENDING : GRADE_NONE;
		answer.setGradeStatus(status);
		answer.setGradedBy(null);
		answer.setGradedAt(null);

		answerGradeMapper.delete(Wrappers.<AnswerGrade>lambdaQuery().eq(AnswerGrade::getAnswerId, answer.getId()));


		answerMapper.update(null, Wrappers.<Answer>lambdaUpdate().eq(Answer::getId, answer.getId())
				.set(Answer::getGradeStatus, status).set(Answer::getGradedBy, null).set(Answer::getGradedAt, null));
	}

	/** ------ 以下为内部实现 ------ */

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


	private SurveySchema resolveSchema(Answer answer) {
		if (answer.getSurvey() != null) {
			return answer.getSurvey();
		}
		Project project = projectMapper.selectById(answer.getProjectId());
		return project == null ? null : project.getSurvey();
	}

	/** 批改/复核页要显示参考答案时的 schema */
	private SurveySchema resolveSchemaWithAnswers(Answer answer) {
		SurveySchema snapshot = answer.getSurvey();
		if (snapshot != null && containsCorrectAnswer(snapshot)) {
			return snapshot;
		}
		Project project = projectMapper.selectById(answer.getProjectId());
		if (project == null || project.getSurvey() == null) {
			return snapshot;
		}
		if (snapshot == null) {
			return project.getSurvey();
		}
		return questionIds(project.getSurvey()).containsAll(questionIds(snapshot)) ? project.getSurvey() : snapshot;
	}

	private static Set<String> questionIds(SurveySchema schema) {
		return SchemaHelper.flatSurveySchema(schema).stream().map(SurveySchema::getId).filter(StringUtils::hasText)
				.collect(Collectors.toSet());
	}

	/** 递归检查快照里是否还带着正确答案（历史快照可能被剥掉过） */
	private static boolean containsCorrectAnswer(SurveySchema schema) {
		if (schema == null || schema.getChildren() == null) {
			return false;
		}
		for (SurveySchema child : schema.getChildren()) {
			if (child.getAttribute() != null && child.getAttribute().getExamCorrectAnswer() != null) {
				return true;
			}
			if (containsCorrectAnswer(child)) {
				return true;
			}
		}
		return false;
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

		String source = StringUtils.hasText(item.getSource()) ? item.getSource() : "manual";
		if (existing == null) {
			AnswerGrade grade = new AnswerGrade();
			grade.setAnswerId(answer.getId());
			grade.setProjectId(answer.getProjectId());
			grade.setQuestionId(item.getQuestionId());
			grade.setScore(item.getScore());
			grade.setComment(item.getComment());
			grade.setGrader(grader);
			grade.setSource(source);
			grade.setCreateAt(now);
			grade.setUpdateAt(now);
			answerGradeMapper.insert(grade);
			return;
		}

		answerGradeMapper.update(null, Wrappers.<AnswerGrade>lambdaUpdate().eq(AnswerGrade::getId, existing.getId())
				.set(AnswerGrade::getScore, item.getScore()).set(AnswerGrade::getComment, item.getComment())
				.set(AnswerGrade::getGrader, grader).set(AnswerGrade::getSource, source)
				.set(AnswerGrade::getUpdateAt, now));
	}

	/** 重算整卷：机器分照旧走 evaluator，人工分作为 manual 题的覆盖值传进去 */
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

	/** 落库总分：exam_score / exam_info.question_score / grade_status / graded_by / graded_at */
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

				answerItemMapper.update(null, Wrappers.<AnswerItem>lambdaUpdate()
						.eq(AnswerItem::getAnswerId, answerId).eq(AnswerItem::getQuestionId, questionId)
						.set(AnswerItem::getScore, null));
				continue;
			}

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

				item.setScore(grade == null ? null : grade.getScore());
				item.setComment(grade == null ? null : grade.getComment());
				item.setSource(grade == null ? null : grade.getSource());
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
