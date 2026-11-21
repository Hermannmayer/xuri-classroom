package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.uitls.AnswerScoreEvaluator;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
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
import cn.surveyking.server.service.AnonymousIdentityService;
import cn.surveyking.server.service.AnswerGradeService;
import cn.surveyking.server.service.AnswerPdfJobService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ClassResourceService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.ValidationException;
import java.util.*;
import java.util.stream.Collectors;





@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
@Slf4j
public class AnswerServiceImpl extends ServiceImpl<AnswerMapper, Answer> implements AnswerService {

	private final ProjectMapper projectMapper;


	private final UserMapper userMapper;


	private final AnswerGradeMapper answerGradeMapper;

	private final AnswerViewMapper answerViewMapper;

	private final AnswerAccessGuard answerAccessGuard;

	private final AnswerItemProjector answerItemProjector;

	private final AnswerItemMapper answerItemMapper;

	private final AnswerItemAnswerRebuilder answerItemAnswerRebuilder;

	private final AnswerSchemaDecorator answerSchemaDecorator;

	private final AnswerExporter answerExporter;


	private final AnswerPdfJobService answerPdfJobService;


	private final FileService fileService;

	private final AnswerSubmitIdempotency answerSubmitIdempotency;

	private final AnswerUploadParser answerUploadParser;

	private final AnswerScoringService answerScoringService;


	private final AnswerGradeService answerGradeService;

	private final AnswerMetaEnricher answerMetaEnricher;

	private final ExerciseAnswerService exerciseAnswerService;

	private final AnswerAttemptAllocator answerAttemptAllocator;


	private final ClassResourceService classResourceService;


	private final AnonymousIdentityService anonymousIdentityService;


	private static final int ANSWERER_NAME_MAX = 64;

	@Override
	public PaginationResponse<AnswerView> listAnswer(AnswerQuery query) {
		PaginationResponse<AnswerView> result = listAnswer(query, true);

		fillCreateByName(result.getList());
		return result;
	}

	/**
	 * 按班级查答卷（报表）：可见性由调用方（ClassService#assertVisible）判定，这里不再套
	 * canManageProject，也不加 create_by = 当前用户，保证「班级可见就能看本班全部」。
	 */
	@Override
	public PaginationResponse<AnswerView> listAnswerByClass(AnswerQuery query) {
		if (query == null || !StringUtils.hasText(query.getProjectId()) || !StringUtils.hasText(query.getClassId())) {
			throw new ValidationException("按班级查答卷需要同时提供项目与班级");
		}
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());
		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Answer> wrapper = Wrappers
				.<Answer>lambdaQuery().isNotNull(Answer::getAnswer)
				.eq(Answer::getProjectId, query.getProjectId())

				.eq(Answer::getClassId, query.getClassId())

				.in(query.getIds() != null && query.getIds().size() > 0, Answer::getId, query.getIds())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.gt(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())

				.eq(query.getAttemptNo() != null, Answer::getAttemptNo, query.getAttemptNo())
				.eq(StringUtils.hasText(query.getGradeStatus()), Answer::getGradeStatus, query.getGradeStatus())


				.apply(Boolean.TRUE.equals(query.getAiReview()),
						"EXISTS (SELECT 1 FROM t_answer_grade g WHERE g.answer_id = t_answer.id AND g.source = 'ai')")

				.ge(query.getMinScore() != null, Answer::getExamScore, query.getMinScore())
				.le(query.getMaxScore() != null, Answer::getExamScore, query.getMaxScore())
				.orderByDesc(Answer::getCreateAt);
		if (StringUtils.hasText(query.getCreateByName())) {
			String like = answererNameLike(query.getCreateByName());
			wrapper.and(filter -> filter.apply("answerer_name like {0}", like)
					.or().apply("create_by in (select id from t_user where name like {0})", like));
		}
		super.page(page, wrapper);
		List<AnswerView> list = answerViewMapper.toView(page.getRecords());
		fillCreateByName(list);
		return new PaginationResponse<>(page.getTotal(), list);
	}





	/**
	 * 批量回填「这份答卷里是否还有 AI 预批改的题」。
	 * <p>一次 in 查询，页大小几十条，成本可以忽略；列表靠它显示「AI 待复核」标签。
	 */
	private void fillAiGraded(List<AnswerView> views) {
		if (views == null || views.isEmpty()) {
			return;
		}
		List<String> ids = views.stream().map(AnswerView::getId).filter(StringUtils::hasText).collect(Collectors.toList());
		if (ids.isEmpty()) {
			return;
		}
		Set<String> aiAnswerIds = new HashSet<>();
		answerGradeMapper
				.selectList(Wrappers.<AnswerGrade>lambdaQuery().select(AnswerGrade::getAnswerId)
						.in(AnswerGrade::getAnswerId, ids).eq(AnswerGrade::getSource, "ai"))
				.forEach(row -> aiAnswerIds.add(row.getAnswerId()));
		views.forEach(view -> view.setAiGraded(aiAnswerIds.contains(view.getId())));
	}

	private void fillCreateByName(List<AnswerView> views) {
		if (views == null || views.isEmpty()) {
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

	/**
	 * 姓名模糊查询的 LIKE 模式串：转义 {@code \ % _}，让「张_」只按字面量匹配
	 * （MySQL LIKE 的默认转义符就是 {@code \}）。
	 * <p>这个值只作为绑定参数进 SQL（{@code apply(..., {0})}），不会被拼进 SQL 文本，注入不了；
	 * 转义只是为了让搜索框里的 % 和 _ 当普通字符，而不是「匹配所有人的通配符」。
	 */
	private static String answererNameLike(String keyword) {
		String text = keyword.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
		return "%" + text + "%";
	}

	@Override
	public List<AnswerView> listByProjectAndLikeConditions(String projectId, List<String> likeValues) {
		if (projectId == null || likeValues == null || likeValues.isEmpty()) {
			return Collections.emptyList();
		}
		List<Answer> answers = list(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, projectId)
				.and(wrapper -> {
					for (String likeValue : likeValues) {
						wrapper.like(Answer::getAnswer, likeValue);
					}
				}));
		return answerViewMapper.toView(answers);
	}

	@Override
	public List<AnswerView> listAnswersForStat(String projectId) {
		List<Answer> answers = list(Wrappers.<Answer>lambdaQuery()
				.select(Answer::getId, Answer::getProjectId, Answer::getAnswer, Answer::getMetaInfo,
						Answer::getExamScore, Answer::getExamInfo, Answer::getTempSave, Answer::getExamExerciseType,
						Answer::getCreateBy, Answer::getCreateAt, Answer::getUpdateAt)
				.eq(Answer::getProjectId, projectId).isNotNull(Answer::getAnswer));
		return answerViewMapper.toView(answers);
	}

	private PaginationResponse<AnswerView> listAnswer(AnswerQuery query, boolean withSnapshot) {
		return listAnswer(query, withSnapshot, true);
	}

	/**
	 * @param withSnapshot 是否读取整卷快照（统计路径为 false）
	 * @param withAnswer 是否读取 {@code t_answer.answer} 原文（导出走投影时为 false）
	 */
	private PaginationResponse<AnswerView> listAnswer(AnswerQuery query, boolean withSnapshot, boolean withAnswer) {
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());


		boolean canSeeAll = answerAccessGuard.canManageProject(query.getProjectId());


		Set<String> classScope = canSeeAll ? Collections.emptySet()
				: answerAccessGuard.readableClassIds(query.getProjectId());
		boolean scopedByClass = !classScope.isEmpty();

		boolean includeAnonymous = canSeeAll && Boolean.TRUE.equals(query.getIncludeAnonymous());
		String currentUserId = SecurityContextUtils.getUserId();
		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Answer> wrapper = Wrappers
				.<Answer>lambdaQuery().isNotNull(Answer::getAnswer)
				.eq(query.getProjectId() != null, Answer::getProjectId, query.getProjectId())

				.eq(!includeAnonymous, Answer::getIsAnonymous, false)

				.eq(StringUtils.hasText(query.getClassId()), Answer::getClassId, query.getClassId())
				.in(query.getIds() != null && query.getIds().size() > 0, Answer::getId, query.getIds())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.gt(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				.eq(query.getId() != null, Answer::getId, query.getId())

				.eq(query.getAttemptNo() != null, Answer::getAttemptNo, query.getAttemptNo())
				.eq(StringUtils.hasText(query.getGradeStatus()), Answer::getGradeStatus, query.getGradeStatus())
				.apply(Boolean.TRUE.equals(query.getAiReview()),
						"EXISTS (SELECT 1 FROM t_answer_grade g WHERE g.answer_id = t_answer.id AND g.source = 'ai')")


				.ge(query.getMinScore() != null, Answer::getExamScore, query.getMinScore())
				.le(query.getMaxScore() != null, Answer::getExamScore, query.getMaxScore())


				.and(StringUtils.hasText(query.getCreateByName()), filter -> {
					String like = answererNameLike(query.getCreateByName());
					filter.apply("answerer_name like {0}", like)
							.or()
							.apply("create_by in (select id from t_user where name like {0})", like);
				})

				.in(scopedByClass, Answer::getClassId, classScope)
				.eq(!canSeeAll && !scopedByClass, Answer::getCreateBy, currentUserId)
				.orderByDesc(Answer::getCreateAt);
		if (!withSnapshot) {

			wrapper.select(Answer::getId, Answer::getProjectId, Answer::getAnswer, Answer::getMetaInfo,
					Answer::getExamScore, Answer::getExamInfo, Answer::getTempSave, Answer::getExamExerciseType,
					Answer::getCreateBy, Answer::getCreateAt, Answer::getUpdateAt);
		}
		else if (!withAnswer) {


			wrapper.select(Answer::getId, Answer::getProjectId, Answer::getRepoId, Answer::getMetaInfo,
					Answer::getExamScore, Answer::getExamInfo, Answer::getTempSave, Answer::getExamExerciseType,
					Answer::getCreateBy, Answer::getCreateAt, Answer::getUpdateAt, Answer::getGradeStatus,
					Answer::getAnswererName, Answer::getClassId);
		}
		super.page(page, wrapper);
		List<AnswerView> list = answerViewMapper.toView(page.getRecords());
		fillAiGraded(list);
		Project project = projectMapper.selectById(query.getProjectId());
		FlatSurveySchemaByType schemaByType = answerSchemaDecorator.parseSurveySchemaByType(project.getSurvey());
		list.forEach(view -> answerSchemaDecorator.setAnswerExtraInfo(view, schemaByType));
		return new PaginationResponse<>(page.getTotal(), list);
	}

	@Override
	public AnswerView getAnswer(AnswerQuery query) {
		AnswerView answerView = null;
		if (query.getId() != null) {
			Answer answer = getById(query.getId());

			answerAccessGuard.assertAnswerAccess(answer);
			answerView = answerViewMapper.toView(answer);
		}
		else if (query.getProjectId() != null && Boolean.TRUE.equals(query.getLatest())) {
			answerView = answerViewMapper.toView(list(Wrappers.<Answer>lambdaQuery()
					.eq(Answer::getProjectId, query.getProjectId())
					.eq(SecurityContextUtils.isAuthenticated(), Answer::getCreateBy, SecurityContextUtils.getUserId())
					.eq(query.getCreateBy() != null, Answer::getCreateBy, query.getCreateBy())
					.orderByDesc(Answer::getCreateAt)).stream().findFirst().orElse(null));
		}
		if (answerView == null) {
			return null;
		}

		if (query.isRankEnabled()) {
			List<Double> scores = list(Wrappers.<Answer>lambdaQuery().select(Answer::getExamScore, Answer::getId)
					.eq(Answer::getProjectId, answerView.getProjectId())).stream()
							.map(x -> Optional.ofNullable(x.getExamScore()).orElse(Double.valueOf(0)))
							.collect(Collectors.toList());
			Collections.sort(scores, Collections.reverseOrder());
			answerView.setRank(scores.indexOf(answerView.getExamScore()) + 1);
		}
		String projectId = answerView.getProjectId();
		Project project = projectMapper.selectById(projectId);
		if (project == null || project.getSurvey() == null) {

			return answerView;
		}
		FlatSurveySchemaByType schemaByType = answerSchemaDecorator.parseSurveySchemaByType(project.getSurvey());
		answerSchemaDecorator.setAnswerExtraInfo(answerView, schemaByType);
		return answerView;
	}

	@Override
	public AnswerView getAnswerWithPermission(AnswerQuery query) {
		if (query.getId() != null) {
			answerAccessGuard.assertAnswerAccess(getById(query.getId()));
		}
		else if (query.getProjectId() != null && Boolean.TRUE.equals(query.getLatest())) {
			answerAccessGuard.assertProjectAccess(query.getProjectId());
		}
		return getAnswer(query);
	}

	@Override
	public AnswerView saveAnswer(AnswerRequest request) {

		if (request.getMetaInfo() != null) {
			request.getMetaInfo().setClientInfo(parseClientInfo(request.getMetaInfo().getClientInfo()));
		}
		if (request.getTempSave() == null) {
			request.setTempSave(1);
		}
		if (StringUtils.hasText(request.getId())) {
			return updateAnswer(request);
		}

		String idempotencyKey = answerSubmitIdempotency.buildSubmitIdempotencyKey(request);
		if (idempotencyKey == null) {
			return createAnswer(request);
		}
		Object lock = answerSubmitIdempotency.lockFor(idempotencyKey);
		synchronized (lock) {
			try {
				AnswerView replayed = answerSubmitIdempotency.replayRecentSubmit(idempotencyKey);
				if (replayed != null) {
					return replayed;
				}
				AnswerView created = createAnswer(request);
				answerSubmitIdempotency.rememberSubmit(idempotencyKey, created);
				return created;
			}
			finally {
				answerSubmitIdempotency.releaseLock(idempotencyKey, lock);
			}
		}
	}

	private AnswerView createAnswer(AnswerRequest request) {
		Answer answer = answerViewMapper.fromRequest(request);

		answer.setId(UUID.randomUUID().toString());
		answer.setCreateAt(new Date());


		answer.setMetaInfo(answerMetaEnricher.enrichMetaInfo(answer.getMetaInfo()));


		boolean anonymous = false;
		String anonymousSubjectId = null;
		if (!SecurityContextUtils.isAuthenticated() && !StringUtils.hasText(answer.getCreateBy())
				&& !StringUtils.hasText(request.getWhitelistName()) && !isLoginRequired(answer.getProjectId())) {
			HttpServletRequest httpRequest = ContextHelper.getCurrentHttpRequest();
			HttpServletResponse httpResponse = ContextHelper.getCurrentHttpResponse();
			if (httpRequest != null && httpResponse != null) {
				anonymousSubjectId = anonymousIdentityService.ensureSubject(httpRequest, httpResponse);
				anonymous = StringUtils.hasText(anonymousSubjectId);
			}
		}


		String actor = anonymous ? null
				: (StringUtils.hasText(answer.getCreateBy()) ? answer.getCreateBy() : SecurityContextUtils.getUserId());
		answer.setCreateBy(actor);
		answer.setAnonymousSubjectId(anonymous ? anonymousSubjectId : null);
		answer.setIsAnonymous(anonymous);
		answer.setAttemptNo(answerAttemptAllocator.next(answer.getProjectId(), actor));

		answer.setAnswererName(resolveAnswererName(request, answer, null, actor));


		String tokenClassId = classResourceService.resolveShareToken(answer.getProjectId(), request.getClassToken());
		if (tokenClassId != null) {
			if (actor != null && !classResourceService.isStudentInClass(actor, tokenClassId)) {
				throw new AccessDeniedException("这个班级链接不属于你的班级");
			}
			answer.setClassId(tokenClassId);
		}
		else if (ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(answer.getProjectId())
				&& StringUtils.hasText(answer.getRepoId()) && actor != null) {

			answer.setClassId(classResourceService.resolveForStudentRepo(answer.getRepoId(), actor));
		}
		else {
			answer.setClassId(actor == null ? null : classResourceService.resolveForStudent(answer.getProjectId(), actor));
		}
		Answer scored = answerScoringService.beforeSaveAnswer(answer, previousAnswerFor(answer));
		try {
			save(scored);
		}
		catch (DuplicateKeyException duplicate) {


			Answer winner = findAttempt(scored);
			if (winner != null) {
				log.info("交卷幂等命中数据库唯一键，回读已有答卷: answerId={}", winner.getId());
				return answerViewMapper.toView(winner);
			}
			throw duplicate;
		}
		rebuildAnswerItems(scored);
		return answerViewMapper.toView(scored);
	}

	/** 项目是否要求登录才能作答；项目/设置缺失按「不要求」处理，避免匿名入口被误判 */
	private boolean isLoginRequired(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			return false;
		}
		Project project = projectMapper.selectById(projectId);
		return project != null && project.getSetting() != null && project.getSetting().getAnswerSetting() != null
				&& Boolean.TRUE.equals(project.getSetting().getAnswerSetting().getLoginRequired());
	}

	/**
	 * 解析答卷上的「答题人姓名」。
	 *
	 * <p>取值优先级：请求里填的 → 库里已有/继承的（fallbackName）→ 登录用户的 t_user.name。
	 * 只是个人展示信息，不做富文本清洗，但要 trim 并按列宽截断。
	 *
	 * <p>项目开了 {@code answerSetting.answererNameRequired} 时，**正式交卷**（tempSave=1）

	 * @param request 本次提交
	 * @param answer 待保存的答卷（用它的 tempSave 判断是否正式交卷）
	 * @param fallbackName 库里已有的姓名（更新答卷时沿用，不会因为这次没传就清空）
	 * @param actor 答题人账号 id（为空表示匿名答卷）
	 * @return 最终写入 t_answer.answerer_name 的值，可能为 null
	 */
	private String resolveAnswererName(AnswerRequest request, Answer answer, String fallbackName, String actor) {
		String name = request != null && StringUtils.hasText(request.getAnswererName())
				? request.getAnswererName().trim() : null;
		if (!StringUtils.hasText(name)) {
			name = fallbackName;
		}
		if (!StringUtils.hasText(name) && StringUtils.hasText(actor)) {
			User user = userMapper.selectById(actor);
			if (user != null && StringUtils.hasText(user.getName())) {
				name = user.getName().trim();
			}
		}
		if (name != null && name.length() > ANSWERER_NAME_MAX) {
			name = name.substring(0, ANSWERER_NAME_MAX);
		}
		boolean finalSubmit = answer != null && Integer.valueOf(1).equals(answer.getTempSave());
		if (finalSubmit && !StringUtils.hasText(name) && isAnswererNameRequired(answer.getProjectId())) {
			throw new ValidationException("请先填写答题人姓名，再交卷");
		}
		return name;
	}

	/** 项目是否要求答题人姓名必填；项目/设置缺失按「不必填」处理，避免匿名入口被误拦 */
	private boolean isAnswererNameRequired(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			return false;
		}
		Project project = projectMapper.selectById(projectId);
		return project != null && project.getSetting() != null && project.getSetting().getAnswerSetting() != null
				&& Boolean.TRUE.equals(project.getSetting().getAnswerSetting().getAnswererNameRequired());
	}

	/** 唯一键冲突后按 (project_id, create_by, attempt_no) 找回赢家 */
	private Answer findAttempt(Answer answer) {
		return getOne(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, answer.getProjectId())
				.eq(answer.getCreateBy() != null, Answer::getCreateBy, answer.getCreateBy())
				.isNull(answer.getCreateBy() == null, Answer::getCreateBy)
				.eq(Answer::getAttemptNo, answer.getAttemptNo()).last("limit 1"), false);
	}

	/** 投影写失败不应该让交卷失败：统计侧有「覆盖数不足就回退内存算法」的兜底 */
	private void rebuildAnswerItems(Answer answer) {
		try {
			answerItemProjector.rebuild(answer);
		}
		catch (Exception e) {
			log.warn("重建答卷明细失败（不影响交卷，统计会回退内存算法）: answerId={}", answer == null ? null : answer.getId(), e);
		}
	}

	/** 库里已存的答卷（更新时存在、新建时为空），交给评分组件做计时与判分基准 */
	private Answer previousAnswerFor(Answer answer) {
		return StringUtils.hasText(answer.getId()) ? getById(answer.getId()) : null;
	}

	@Override
	public long count(AnswerQuery query) {
		return count(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, query.getProjectId())
				.ge(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.eq(query.getCreateBy() != null, Answer::getCreateBy, query.getCreateBy())
				.like(query.getIp() != null, Answer::getMetaInfo, query.getIp())
				.like(query.getValueQuery() != null, Answer::getAnswer, query.getValueQuery())
				.like(query.getCookie() != null, Answer::getMetaInfo, query.getCookie())
				.eq(Boolean.TRUE.equals(query.getExcludeAnonymous()), Answer::getIsAnonymous, false));
	}

	@Override
	public AnswerView updateAnswer(AnswerRequest request) {
		Answer answer = answerViewMapper.fromRequest(request);


		Answer previous = previousAnswerFor(answer);
		if (previous != null) {
			answer.setIsAnonymous(previous.getIsAnonymous());
			answer.setAnonymousSubjectId(previous.getAnonymousSubjectId());


			answer.setGradeStatus(previous.getGradeStatus());
			answer.setGradedBy(previous.getGradedBy());
			answer.setGradedAt(previous.getGradedAt());

			if (!StringUtils.hasText(previous.getClassId())) {
				String tokenClassId = classResourceService.resolveShareToken(previous.getProjectId(), request.getClassToken());
				if (tokenClassId != null) {
					if (StringUtils.hasText(previous.getCreateBy())
							&& !classResourceService.isStudentInClass(previous.getCreateBy(), tokenClassId)) {
						throw new AccessDeniedException("这个班级链接不属于你的班级");
					}
					answer.setClassId(tokenClassId);
				}
			}
		}


		answer.setAnswererName(resolveAnswererName(request, answer, previous == null ? null : previous.getAnswererName(),
				previous == null ? null : previous.getCreateBy()));
		answer = answerScoringService.beforeSaveAnswer(answer, previous);
		updateById(answer);
		rebuildAnswerItems(answer);
		return answerViewMapper.toView(answer);
	}

	@Override
	public AnswerView updateAnswerWithPermission(AnswerRequest request) {
		if (StringUtils.hasText(request.getId())) {
			Answer answer = getById(request.getId());
			answerAccessGuard.assertAnswerAccess(answer);

			request.setProjectId(answer.getProjectId());
		}
		else {
			answerAccessGuard.assertProjectAccess(request.getProjectId());
		}
		return updateAnswer(request);
	}

	@Override
	public void deleteAnswer(AnswerRequest request) {
		answerAccessGuard.assertAnswersAccess(request.getIds());
		super.removeByIds(request.getIds());
	}

	@Override
	public DownloadData downloadSurvey(DownloadQuery query) {
		Project project = projectMapper.selectById(query.getProjectId());

		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setProjectId(query.getProjectId());
		answerQuery.setIds(query.getIds());
		answerQuery.setStartTime(query.getStartTime());
		answerQuery.setEndTime(query.getEndTime());

		answerQuery.setClassId(query.getClassId());

		answerQuery.setAttemptNo(query.getAttemptNo());


		answerQuery.setIncludeAnonymous(!Boolean.FALSE.equals(query.getIncludeAnonymous()));


		answerQuery.setGradeStatus(query.getGradeStatus());
		answerQuery.setCreateByName(query.getCreateByName());
		answerQuery.setMinScore(query.getMinScore());
		answerQuery.setMaxScore(query.getMaxScore());
		if (query.getPageSize() != 0) {
			answerQuery.setCurrent(query.getCurrent());
			answerQuery.setPageSize(query.getPageSize());
		}
		else {
			answerQuery.setPageSize(Integer.MAX_VALUE);
		}


		boolean projectionReady = projectionCoversAnswers(query.getProjectId());
		List<AnswerView> answerViews = listAnswer(answerQuery, true, !projectionReady).getList();
		if (projectionReady) {
			fillAnswersFromProjection(answerViews);
		}
		return answerExporter.downloadSurvey(project, answerViews);
	}

	/**
	 * 按班级导出答卷（xlsx）：只含该班已提交答卷，走真源 JSON（不做投影优化）。
	 *
	 * <p>班级可见性由调用方（AnswerApi → ClassService#assertVisible）先校验。
	 */
	@Override
	public DownloadData downloadByClass(DownloadQuery query) {
		if (query == null || !StringUtils.hasText(query.getProjectId()) || !StringUtils.hasText(query.getClassId())) {
			throw new ValidationException("按班级导出需要同时提供项目与班级");
		}
		if (query.getType() != null && query.getType() != DownloadQuery.DownloadType.answer) {

			throw new ValidationException("按班级导出暂只支持答卷");
		}
		Project project = projectMapper.selectById(query.getProjectId());
		if (project == null) {
			throw new ValidationException("项目不存在");
		}
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setProjectId(query.getProjectId());
		answerQuery.setClassId(query.getClassId());
		answerQuery.setIds(query.getIds());
		answerQuery.setStartTime(query.getStartTime());
		answerQuery.setEndTime(query.getEndTime());


		answerQuery.setAttemptNo(query.getAttemptNo());

		answerQuery.setGradeStatus(query.getGradeStatus());
		answerQuery.setCreateByName(query.getCreateByName());
		answerQuery.setMinScore(query.getMinScore());
		answerQuery.setMaxScore(query.getMaxScore());
		answerQuery.setPageSize(Integer.MAX_VALUE);
		List<AnswerView> answerViews = listAnswerByClass(answerQuery).getList();
		return answerExporter.downloadSurvey(project, answerViews);
	}

	/**
	 * 按班级导出答卷 PDF（每人一份，整体打成 ZIP）：交给 {@link AnswerPdfJobService} 异步渲染。
	 *
	 * <p>
	 * 为什么不搞「≤20 份同步返回、>20 走任务」：同步渲染 20 份也要十几秒，期间一直占着 HTTP 连接

	 *
	 * <p>
	 * 班级可见性（{@code ClassService#assertVisible}）与导出密码/一次性 token 由调用方
	 * （{@code AnswerExportApi}）先校验；这里只负责把范围固化成任务快照。
	 * @param query 导出范围（项目 + 班级 + 轮次 + 交卷时间范围 + 是否含解析/图片）
	 * @return 任务 id
	 */
	public String downloadPdfByClass(DownloadQuery query) {


		return answerPdfJobService.createJob(query);
	}

	/**
	 * 下载附件要使用 InputStreamResource，避免 Byte... 加载到内存
	 * @param query
	 * @return
	 */
	@Override
	public DownloadData downloadAttachment(DownloadQuery query) {
		Project project = projectMapper.selectById(query.getProjectId());
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setIds(query.getIds());
		answerQuery.setProjectId(query.getProjectId());
		answerQuery.setStartTime(query.getStartTime());
		answerQuery.setEndTime(query.getEndTime());

		answerQuery.setClassId(query.getClassId());

		answerQuery.setAttemptNo(query.getAttemptNo());
		if (query.getCurrent() != 0 && query.getPageSize() != 0) {
			answerQuery.setCurrent(query.getCurrent());
			answerQuery.setPageSize(query.getPageSize());
		}
		else {
			answerQuery.setPageSize(Integer.MAX_VALUE);
		}

		if (query.getAnswerId() != null) {
			answerQuery.setId(query.getAnswerId());
			return answerExporter.generateSurveyAttachment(project, listAnswer(answerQuery).getList().get(0));
		}
		return answerExporter.downloadAttachmentZip(project, listAnswer(answerQuery).getList(), query);
	}

	/** 全部答卷都同步过明细才走投影；与统计用同一判据（items_synced 而不是投影行数） */
	private boolean projectionCoversAnswers(String projectId) {
		AnswerQuery countQuery = new AnswerQuery();
		countQuery.setProjectId(projectId);
		long total = count(countQuery);
		if (total <= 0) {
			return false;
		}
		return answerItemMapper.countSyncedAnswers(projectId) >= total;
	}

	/** 按答卷 id 批量取明细（500 一批），把 answer 重建回视图；投影是派生数据，真源仍是 answer JSON */
	private void fillAnswersFromProjection(List<AnswerView> views) {
		if (views == null || views.isEmpty()) {
			return;
		}
		List<String> answerIds = views.stream().map(AnswerView::getId).filter(Objects::nonNull)
				.collect(Collectors.toList());
		Map<String, List<AnswerItem>> itemsByAnswer = new HashMap<>();
		for (int from = 0; from < answerIds.size(); from += 500) {
			List<String> chunk = answerIds.subList(from, Math.min(from + 500, answerIds.size()));
			for (AnswerItem item : answerItemMapper.selectByAnswerIds(chunk)) {
				itemsByAnswer.computeIfAbsent(item.getAnswerId(), key -> new ArrayList<>()).add(item);
			}
		}
		views.forEach(view -> view.setAnswer(
				answerItemAnswerRebuilder.rebuild(itemsByAnswer.getOrDefault(view.getId(), Collections.emptyList()))));
	}

	@Override
	public List<AnswerView> listAnswerDeleted(AnswerQuery query) {
		List<AnswerView> list = answerViewMapper.toView(getBaseMapper().selectLogicDeleted(query.getProjectId()));
		Project project = projectMapper.selectById(query.getProjectId());
		FlatSurveySchemaByType schemaByType = answerSchemaDecorator.parseSurveySchemaByType(project.getSurvey());
		list.forEach(view -> answerSchemaDecorator.setAnswerExtraInfo(view, schemaByType));
		return list;
	}

	@Override
	public void batchDestroyAnswer(AnswerRequest request) {
		answerAccessGuard.assertAnswersAccess(request.getIds());
		List<String> ids = request.getIds();
		this.getBaseMapper().batchDestroy(ids);




		runAfterCommit(() -> fileService.deleteByAnswers(ids));
	}

	/** 事务提交后再执行（无事务时立即执行）。用于「物理文件删除」这类不可回滚的副作用。 */
	private static void runAfterCommit(Runnable action) {
		if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
			org.springframework.transaction.support.TransactionSynchronizationManager
					.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
						@Override
						public void afterCommit() {
							action.run();
						}
					});
		}
		else {
			action.run();
		}
	}

	@Override
	public void restoreAnswer(AnswerRequest request) {
		answerAccessGuard.assertAnswersAccess(request.getIds());
		this.getBaseMapper().restoreAnswer(request.getIds());
	}

	@Override
	public AnswerUploadView upload(AnswerUploadRequest request) {
		return answerUploadParser.upload(request, this::saveImportedAnswers);
	}

	/**
	 * Excel 导入的答卷落库前补齐「交卷语义」。
	 *
	 * <p>解析器只填 projectId 与 answer，temp_save / 判分 / 批改状态一概没有：
	 * 导入的卷子在数据页显示成「暂存」、不进「已交」，也不会进待批改。
	 * 这里按项目口径补 temp_save=1，考试项目再跑一次判分与批改状态机——
	 * 与 {@code AnswerScoringService#beforeSaveAnswer} 用同一个评估器，但不跑计时与附件校验
	 * （导入的是已经完成的答卷，不该被「最短答题时间」拦下）。
	 */
	private void saveImportedAnswers(List<Answer> answers) {
		if (answers == null || answers.isEmpty()) {
			return;
		}
		Map<String, Project> projectCache = new HashMap<>();
		for (Answer answer : answers) {
			if (answer.getTempSave() == null) {
				answer.setTempSave(1);
			}
			Project project = answer.getProjectId() == null ? null
					: projectCache.computeIfAbsent(answer.getProjectId(), projectMapper::selectById);
			if (project == null || project.getSurvey() == null) {
				continue;
			}
			if (importedScoringEnabled(project) && answer.getAnswer() != null) {
				AnswerScoreEvaluator evaluator = new AnswerScoreEvaluator(project.getSurvey(), answer.getAnswer());
				answer.setExamScore(evaluator.eval());
				AnswerExamInfo examInfo = new AnswerExamInfo();
				examInfo.setQuestionScore(evaluator.getQuestionScore());
				answer.setExamInfo(examInfo);
			}
			answerGradeService.onSubmitted(answer, project.getSurvey());
		}
		saveBatch(answers);
	}

	/** 导入时的计分开关：与 AnswerScoringService 同一口径（显式配置优先，未配置时考试默认计分） */
	private static boolean importedScoringEnabled(Project project) {
		Boolean flag = project.getSetting() == null || project.getSetting().getExamSetting() == null ? null
				: project.getSetting().getExamSetting().getScoringEnabled();
		return flag != null ? flag : ProjectModeEnum.exam.equals(project.getMode());
	}

	@Override
	public PaginationResponse<ExerciseView> historyExercise(HistoryExerciseQuery query) {
		return exerciseAnswerService.historyExercise(query);
	}

	@Override
	public void deleteExercise(AnswerRequest request) {
		exerciseAnswerService.deleteExercise(request);
	}

}
