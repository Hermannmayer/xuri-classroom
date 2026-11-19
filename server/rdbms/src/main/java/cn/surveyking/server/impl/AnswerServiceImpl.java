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

/**
 * @author javahuang
 * @date 2021/8/3
 */
@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
@Slf4j
public class AnswerServiceImpl extends ServiceImpl<AnswerMapper, Answer> implements AnswerService {

	private final ProjectMapper projectMapper;

	/** 答卷列表回填答题人姓名用（只读 t_user.name，不参与权限） */
	private final UserMapper userMapper;

	/** 列表回填「是否含 AI 预批改」用 */
	private final AnswerGradeMapper answerGradeMapper;

	private final AnswerViewMapper answerViewMapper;

	private final AnswerAccessGuard answerAccessGuard;

	private final AnswerItemProjector answerItemProjector;

	private final AnswerItemMapper answerItemMapper;

	private final AnswerItemAnswerRebuilder answerItemAnswerRebuilder;

	private final AnswerSchemaDecorator answerSchemaDecorator;

	private final AnswerExporter answerExporter;

	/** 答卷 PDF 批量导出（异步任务）：只新建任务，渲染在后台线程池里跑 */
	private final AnswerPdfJobService answerPdfJobService;

	/** 物理删除答卷时清它的附件（手写签名 / 上传题图片） */
	private final FileService fileService;

	private final AnswerSubmitIdempotency answerSubmitIdempotency;

	private final AnswerUploadParser answerUploadParser;

	private final AnswerScoringService answerScoringService;

	/** 导入答卷要补「批改状态机」，与交卷链路同一个入口 */
	private final AnswerGradeService answerGradeService;

	private final AnswerMetaEnricher answerMetaEnricher;

	private final ExerciseAnswerService exerciseAnswerService;

	private final AnswerAttemptAllocator answerAttemptAllocator;

	/** 新建答卷时解析「答题时所在班级」（按班级分配的考试窗口） */
	private final ClassResourceService classResourceService;

	/** 匿名答题身份：公开问卷未登录时写 sk-anon，答卷挂 anonymous_subject_id */
	private final AnonymousIdentityService anonymousIdentityService;

	/** 答题人姓名最长长度（与 t_answer.answerer_name varchar(64) 对齐） */
	private static final int ANSWERER_NAME_MAX = 64;

	@Override
	public PaginationResponse<AnswerView> listAnswer(AnswerQuery query) {
		PaginationResponse<AnswerView> result = listAnswer(query, true);
		// 列表页要显示答题人姓名（AnswerView.createByName）；导出/统计不走这里，避免大 IN 查询
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
				.<Answer>lambdaQuery().isNotNull(Answer::getAnswer) // 暂存题答案会为空
				.eq(Answer::getProjectId, query.getProjectId())
				// 答题时所在班级：学员换班后历史答卷仍算在原班
				.eq(Answer::getClassId, query.getClassId())
				// 班级链接产生的匿名答卷也带 class_id，班级报表必须能看到；普通匿名链接 class_id 为空，不会混入
				.in(query.getIds() != null && query.getIds().size() > 0, Answer::getId, query.getIds())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.gt(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				// 第几次作答（补考区分）与批改状态；传空表示不过滤
				.eq(query.getAttemptNo() != null, Answer::getAttemptNo, query.getAttemptNo())
				.eq(StringUtils.hasText(query.getGradeStatus()), Answer::getGradeStatus, query.getGradeStatus())
				// AI 待复核：只要还有任意一题是 AI 给的（source='ai'），这份卷子就该被老师看一眼。
				// 用 EXISTS 而不是 IN：一份卷子几十道题，子查询命中即返回。
				.apply(Boolean.TRUE.equals(query.getAiReview()),
						"EXISTS (SELECT 1 FROM t_answer_grade g WHERE g.answer_id = t_answer.id AND g.source = 'ai')")
				// 姓名模糊与分数段：与 listAnswer 同一套条件，否则「班级抽屉里筛不到、也导不出」
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
	 * 批量回填答题人姓名：一页最多几十条，一次 in 查询足够；createBy 为空或查不到（例如白名单导入的
	 * 参与者 id）就留 null。
	 */
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
		// 数据范围：管理员 / 项目所有者或协作者（含组授权）看全部；其他人（学员）只能看自己的答卷。
		// 之前只靠 @PreAuthorize('answer:list')，学员知道 projectId 就能列出全班答卷。
		boolean canSeeAll = answerAccessGuard.canManageProject(query.getProjectId());
		// 班级级老师（考试分配给自己带的班，但不是项目协作者）：只看本班，别顺着 projectId 看别的班。
		// 空集 = 没有班级级权限，退回「只看自己」的老口径。
		Set<String> classScope = canSeeAll ? Collections.emptySet()
				: answerAccessGuard.readableClassIds(query.getProjectId());
		boolean scopedByClass = !classScope.isEmpty();
		// 只有能看到项目全部答卷的管理者才允许显式包含匿名；普通学员即使传了也按默认过滤
		boolean includeAnonymous = canSeeAll && Boolean.TRUE.equals(query.getIncludeAnonymous());
		String currentUserId = SecurityContextUtils.getUserId();
		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Answer> wrapper = Wrappers
				.<Answer>lambdaQuery().isNotNull(Answer::getAnswer) // 暂存题答案会为空
				.eq(query.getProjectId() != null, Answer::getProjectId, query.getProjectId())
				// 报表默认只统计非匿名答卷；管理员/项目管理者显式 includeAnonymous 才放开
				.eq(!includeAnonymous, Answer::getIsAnonymous, false)
				// 按班级过滤（答题时所在班级）；为空不过滤
				.eq(StringUtils.hasText(query.getClassId()), Answer::getClassId, query.getClassId())
				.in(query.getIds() != null && query.getIds().size() > 0, Answer::getId, query.getIds())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.gt(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				.eq(query.getId() != null, Answer::getId, query.getId())
				// 第几次作答（补考区分）与批改状态；传空表示不过滤
				.eq(query.getAttemptNo() != null, Answer::getAttemptNo, query.getAttemptNo())
				.eq(StringUtils.hasText(query.getGradeStatus()), Answer::getGradeStatus, query.getGradeStatus())
				.apply(Boolean.TRUE.equals(query.getAiReview()),
						"EXISTS (SELECT 1 FROM t_answer_grade g WHERE g.answer_id = t_answer.id AND g.source = 'ai')")
				// 分数段（含边界）：exam_score 为 NULL（未判分 / 非考试卷）时比较恒为 UNKNOWN，
				// 不会被 >= / <= 误命中，因此不需要额外的 is not null
				.ge(query.getMinScore() != null, Answer::getExamScore, query.getMinScore())
				.le(query.getMaxScore() != null, Answer::getExamScore, query.getMaxScore())
				// 答题人姓名：快照列（新数据）与账号名（老数据没有快照）两头都要查，见 AnswerQuery#createByName。
				// 整组用 and(...) 包起来，否则 OR 会把前面的项目/班级条件一起短路掉
				.and(StringUtils.hasText(query.getCreateByName()), filter -> {
					String like = answererNameLike(query.getCreateByName());
					filter.apply("answerer_name like {0}", like)
							.or()
							.apply("create_by in (select id from t_user where name like {0})", like);
				})
				// 班级级老师按班级范围过滤；其余（学员/未分配的老师）只看自己的答卷
				.in(scopedByClass, Answer::getClassId, classScope)
				.eq(!canSeeAll && !scopedByClass, Answer::getCreateBy, currentUserId)
				.orderByDesc(Answer::getCreateAt);
		if (!withSnapshot) {
			// 统计路径：只取统计与权限判定需要的列，整卷快照与暂存答案一律不读。
			wrapper.select(Answer::getId, Answer::getProjectId, Answer::getAnswer, Answer::getMetaInfo,
					Answer::getExamScore, Answer::getExamInfo, Answer::getTempSave, Answer::getExamExerciseType,
					Answer::getCreateBy, Answer::getCreateAt, Answer::getUpdateAt);
		}
		else if (!withAnswer) {
			// S2-4 导出读投影：answer / survey / temp_answer 三个大字段都不读，答案由 t_answer_item 重建。
			// gradeStatus / answererName 必须一起查：导出要按批改状态过滤，PDF 抬头要显示答题人姓名。
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
			// 按 id 读单份答卷也要做数据范围校验：本人 / 管理员 / 项目所有者或协作者
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
		// 获取考试排名信息
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
			// 随机问题问卷没有 schema
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
		// 公开查询修改答案时不会传元数据
		if (request.getMetaInfo() != null) {
			request.getMetaInfo().setClientInfo(parseClientInfo(request.getMetaInfo().getClientInfo()));
		}
		if (request.getTempSave() == null) {
			request.setTempSave(1);
		}
		if (StringUtils.hasText(request.getId())) {
			return updateAnswer(request);
		}
		// 新建答卷：先过一层应用级幂等，双击/网络重试不会再产生两条记录
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
		// 使用 uuid 作为外部公开查询引用，防暴力破解
		answer.setId(UUID.randomUUID().toString());
		answer.setCreateAt(new Date());
		// 新前端不再上传 metaInfo，「每 IP / 每台设备限次」会永远统计为 0：
		// 这里在服务端补齐真实 IP 与限次 cookie 标识。
		answer.setMetaInfo(answerMetaEnricher.enrichMetaInfo(answer.getMetaInfo()));
		// 匿名答卷：未登录、没有请求里的伪身份、且项目不要求登录时，挂到 sk-anon 主体上。
		// 登录用户/教职工（以及白名单导入的伪 createBy）保持原来的 create_by 逻辑。
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
		// S1-3：先确定答题人再分配作答序号。createBy 由 MetaObjectHandler 兜底填当前登录用户，
		// 这里提前算出来，保证 attempt_no 和最终写进库的 create_by 是同一个值。
		String actor = anonymous ? null
				: (StringUtils.hasText(answer.getCreateBy()) ? answer.getCreateBy() : SecurityContextUtils.getUserId());
		answer.setCreateBy(actor);
		answer.setAnonymousSubjectId(anonymous ? anonymousSubjectId : null);
		answer.setIsAnonymous(anonymous);
		answer.setAttemptNo(answerAttemptAllocator.next(answer.getProjectId(), actor));
		// 答题人姓名：请求里填了就用它，否则用登录用户的姓名补齐；开了「姓名必填」时正式交卷必须非空。
		answer.setAnswererName(resolveAnswererName(request, answer, null, actor));
		// 班级归属：优先认班级专属链接 token；普通链接再按学员自己的班解析。
		// 匿名用户没有 actor，token 是唯一可审计的班级来源；登录学员必须确实属于 token 班，防止跨班伪造。
		String tokenClassId = classResourceService.resolveShareToken(answer.getProjectId(), request.getClassToken());
		if (tokenClassId != null) {
			if (actor != null && !classResourceService.isStudentInClass(actor, tokenClassId)) {
				throw new AccessDeniedException("这个班级链接不属于你的班级");
			}
			answer.setClassId(tokenClassId);
		}
		else if (ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(answer.getProjectId())
				&& StringUtils.hasText(answer.getRepoId()) && actor != null) {
			// 题库练习：按题库的班级分配归属，便于班级维度看练习记录
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
			// 多实例并发提交：唯一键 (project_id, create_by, attempt_no) 裁决，另一条已经落库就回读它。
			// 这样重复提交只会产生一条答卷，而不是把 500 抛给前端。
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
	 * 必须拿到非空姓名；暂存不拦，否则填一半保存就报错很烦。
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
		// 匿名标识与 class_id 同一原则：更新答案不重算。fromRequest 会把 isAnonymous 初始成 false，
		// 若不显式回填，匿名答卷保存第二次就会被 updateById 改成非匿名。
		Answer previous = previousAnswerFor(answer);
		if (previous != null) {
			answer.setIsAnonymous(previous.getIsAnonymous());
			answer.setAnonymousSubjectId(previous.getAnonymousSubjectId());
			// 批改状态同理：请求体不带 gradeStatus 时不能让它回落成默认值再被 updateById 写进库。
			// 显式沿用库里的值，真正的重算交给下面的 beforeSaveAnswer → onSubmitted。
			answer.setGradeStatus(previous.getGradeStatus());
			answer.setGradedBy(previous.getGradedBy());
			answer.setGradedAt(previous.getGradedAt());
			// 历史草稿没有 class_id 时，用本次班级链接补一次；已有归属不覆盖
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
		// 答题人姓名：请求带了就用新的；没带就沿用库里已有的（草稿转正式提交时不会丢）；
		// 都没有时用登录用户姓名补齐。
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
			// 后台编辑只能更新原问卷下的答案，避免通过请求参数迁移到其他问卷
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
		// 按班导出：只导出该班的答卷（class_id 为答题时所在班级）
		answerQuery.setClassId(query.getClassId());
		// 第几次作答（补考区分）；为空导出全部轮次
		answerQuery.setAttemptNo(query.getAttemptNo());
		// 匿名答卷：管理端默认导出全部（与数据页「含匿名」口径一致）；
		// 显式传 false 时保持旧行为，只导出实名答卷。
		answerQuery.setIncludeAnonymous(!Boolean.FALSE.equals(query.getIncludeAnonymous()));
		// 数据页的筛选条与导出口径必须一致：筛了「待批改 / 60 分以下 / 张」却导出一整场，
		// 老师会把导出文件当成「筛选结果」发出去。同样的条件在 downloadByClass 里也要带上。
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
		// S2-4：投影覆盖全部答卷时只读投影（瘦查询 + 重建 answer）；否则回退真源 JSON，
		// 保证「回填前 / 回填中 / 回填后」导出的列与内容完全一致。
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
			// 附件按班导出暂未支持：宁可报错，也不要回一份「答卷 xlsx」冒充附件导出
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
		// 第几次作答：补考场景老师通常只要某一轮，Excel 明细也要能按轮次筛。
		// （之前只给 PDF 任务传了，按班导出的 xlsx 会无视这个条件，导全轮次。）
		answerQuery.setAttemptNo(query.getAttemptNo());
		// 与数据页筛选条同口径：按班导出时也要遵守「待批改 / 姓名 / 分数段」
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
	 * 和服务线程；而前端本来就要轮询进度，统一走任务少一条代码路径、也少一处超时坑。
	 *
	 * <p>
	 * 班级可见性（{@code ClassService#assertVisible}）与导出密码/一次性 token 由调用方
	 * （{@code AnswerExportApi}）先校验；这里只负责把范围固化成任务快照。
	 * @param query 导出范围（项目 + 班级 + 轮次 + 交卷时间范围 + 是否含解析/图片）
	 * @return 任务 id
	 */
	public String downloadPdfByClass(DownloadQuery query) {
		// 校验（项目是否存在/类型是否对）与范围固化都在 JobService 里做，这里只留 Service 层的入口，
		// 避免「Service 校验一套、JobService 取数另一套」两边范围对不上。
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
		// 按班导出附件：只导出该班答卷的附件
		answerQuery.setClassId(query.getClassId());
		// 第几次作答（补考区分）；为空导出全部轮次
		answerQuery.setAttemptNo(query.getAttemptNo());
		if (query.getCurrent() != 0 && query.getPageSize() != 0) {
			answerQuery.setCurrent(query.getCurrent());
			answerQuery.setPageSize(query.getPageSize());
		}
		else {
			answerQuery.setPageSize(Integer.MAX_VALUE);
		}
		// 下载某个问卷答案的附件
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
		// 文件清理放在**事务提交之后**：物理文件删掉是不能回滚的，
		// 先删行再删文件 → 删行失败时文件还在（最多浪费空间）；
		// 反过来则是「文件没了但答卷还在」，那是坏数据。
		// 万一这里删文件失败，t_file.answer_id 变成孤儿，由 FileOrphanCleanupService 兜底。
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
