package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.AttachmentNameVariableEnum;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.constant.StorageTypeEnum;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.*;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.AnswerViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerItem;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.*;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.springframework.beans.BeanUtils;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.util.WebUtils;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import java.io.*;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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

	private final FileService fileService;

	private final AnswerViewMapper answerViewMapper;

	private final UserService userService;

	private final DeptService deptService;

	private final ProjectService projectService;

	private final ProjectPartnerMapper projectPartnerMapper;

	private final UserDeptScopeService userDeptScopeService;

	private final AnswerAccessGuard answerAccessGuard;

	private final AnswerAssembler answerAssembler;

	private final AnswerItemProjector answerItemProjector;

	/** 客户端上报「本轮开始时间」时允许的最大跨度：超过 24 小时的声称一律不认 */
	private static final long MAX_ATTEMPT_SPAN_MS = 24 * 60 * 60 * 1000L;

	/** 允许的时钟偏差：客户端时间晚于服务器时最多容忍 1 分钟 */
	private static final long CLOCK_SKEW_MS = 60 * 1000L;

	/** 交卷宽限：到点后留 60 秒给网络延迟与自动交卷，避免边界误杀 */
	private static final long SUBMIT_GRACE_MS = 60 * 1000L;

	/** 提交幂等窗口：同一（项目 + 答题人 + 答案指纹）在窗口内重复新建，直接回放第一次的答卷 */
	private static final long SUBMIT_IDEMPOTENCY_WINDOW_MS = 15 * 1000L;

	/** 幂等表容量上限，超过就清一次过期项（单实例内存表，防止长跑进程膨胀） */
	private static final int SUBMIT_IDEMPOTENCY_MAX_ENTRIES = 2000;

	/** 幂等键 → 提交锁：双击/重试的第二枪会等第一枪跑完再走回放分支 */
	private final ConcurrentMap<String, Object> submitLocks = new ConcurrentHashMap<>();

	/** 幂等键 → 最近一次成功新建的答卷（用于回放，不依赖数据库是否已经可见） */
	private final ConcurrentMap<String, RecentSubmit> recentSubmits = new ConcurrentHashMap<>();

	/**
	 * 导出线程池：最多 2 个并发导出，队列 4。
	 * <p>
	 * 之前每来一个导出请求就 {@code new Thread}，且先把全部行在内存里组装成 List 再交给 Excel 库；
	 * 两个老师同时导 500 份 × 100 题的卷，峰值就能吃掉几百 MB 堆。-Xmx768m 下这是最容易触发 OOM 的路径。
	 * 队列满时直接拒绝（AbortPolicy），让请求拿到明确错误，而不是把 JVM 拖死。
	 */
	private static final ExecutorService EXPORT_POOL = new ThreadPoolExecutor(2, 2, 60L, TimeUnit.SECONDS,
			new ArrayBlockingQueue<>(4), runnable -> {
				Thread thread = new Thread(runnable, "answer-export");
				thread.setDaemon(true);
				return thread;
			});

	@Override
	public PaginationResponse<AnswerView> listAnswer(AnswerQuery query) {
		return listAnswer(query, true);
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
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());
		// 数据范围：管理员 / 项目所有者或协作者（含组授权）看全部；其他人（学员）只能看自己的答卷。
		// 之前只靠 @PreAuthorize('answer:list')，学员知道 projectId 就能列出全班答卷。
		boolean canSeeAll = answerAccessGuard.canManageProject(query.getProjectId());
		String currentUserId = SecurityContextUtils.getUserId();
		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Answer> wrapper = Wrappers
				.<Answer>lambdaQuery().isNotNull(Answer::getAnswer) // 暂存题答案会为空
				.eq(query.getProjectId() != null, Answer::getProjectId, query.getProjectId())
				.in(query.getIds() != null && query.getIds().size() > 0, Answer::getId, query.getIds())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.gt(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				.eq(query.getId() != null, Answer::getId, query.getId())
				.eq(!canSeeAll, Answer::getCreateBy, currentUserId)
				.orderByDesc(Answer::getCreateAt);
		if (!withSnapshot) {
			// 统计路径：只取统计与权限判定需要的列，整卷快照与暂存答案一律不读。
			wrapper.select(Answer::getId, Answer::getProjectId, Answer::getAnswer, Answer::getMetaInfo,
					Answer::getExamScore, Answer::getExamInfo, Answer::getTempSave, Answer::getExamExerciseType,
					Answer::getCreateBy, Answer::getCreateAt, Answer::getUpdateAt);
		}
		super.page(page, wrapper);
		List<AnswerView> list = answerViewMapper.toView(page.getRecords());
		Project project = projectMapper.selectById(query.getProjectId());
		FlatSurveySchemaByType schemaByType = parseSurveySchemaByType(project.getSurvey());
		list.forEach(view -> setAnswerExtraInfo(view, schemaByType));
		return new PaginationResponse<>(page.getTotal(), list);
	}

	private FlatSurveySchemaByType parseSurveySchemaByType(SurveySchema schema) {
		FlatSurveySchemaByType schemaByType = new FlatSurveySchemaByType();
		List<SurveySchema> schemaDataTypes = SchemaHelper.flatSurveySchema(schema);
		schemaByType.setSchemaDataTypes(schemaDataTypes);
		schemaByType.setUserQuestions(parseSurveySchemaByType(schemaDataTypes, SurveySchema.QuestionType.User));
		schemaByType.setDeptQuestions(parseSurveySchemaByType(schemaDataTypes, SurveySchema.QuestionType.Dept));
		schemaByType.setFileQuestions(parseSurveySchemaByType(schemaDataTypes, SurveySchema.QuestionType.Signature));
		schemaByType.getFileQuestions()
				.addAll((parseSurveySchemaByType(schemaDataTypes, SurveySchema.QuestionType.Upload)));
		return schemaByType;
	}

	private List<SurveySchema> parseSurveySchemaByType(List<SurveySchema> flattedSurveySchema,
			SurveySchema.QuestionType questionType) {
		return flattedSurveySchema.stream().filter(x -> x.getType() == questionType).collect(Collectors.toList());
	}

	private void setAnswerExtraInfo(AnswerView view, FlatSurveySchemaByType schemaByType) {
		setAnswerTypeInfo(schemaByType.getDeptQuestions(), view);
		setAnswerTypeInfo(schemaByType.getFileQuestions(), view);
		setAnswerTypeInfo(schemaByType.getUserQuestions(), view);
		answerAssembler.setUserName(view);
	}

	private void setAnswerTypeInfo(List<SurveySchema> flatQuestionSchema, AnswerView view) {
		if (flatQuestionSchema.size() == 0) {
			return;
		}
		LinkedHashMap<String, Object> answers = view.getAnswer();
		SurveySchema.QuestionType questionType = flatQuestionSchema.get(0).getType();
		flatQuestionSchema.forEach(question -> {
			String questionId = question.getId();
			Object option2value = answers.get(questionId);
			if (option2value != null && option2value instanceof Map) {
				// 签名题前端存的是 {qId: {oId: fileId}} 需要转换成数组
				((Map<String, Object>) option2value).values().stream().map(x -> {
					if (x instanceof List) {
						return (List<String>) x;
					}
					return Collections.singletonList(x.toString());
				}).collect(Collectors.toList()).forEach(ids -> {
					if (questionType == SurveySchema.QuestionType.User) {
						view.setUsers(ids.stream().map(userId -> userService.loadUserById(userId).simpleMode())
								.collect(Collectors.toList()));
					}
					else if (questionType == SurveySchema.QuestionType.Signature
							|| questionType == SurveySchema.QuestionType.Upload) {
						FileQuery query = new FileQuery();
						query.setType(StorageTypeEnum.ANSWER_ATTACHMENT.getType());
						query.setIds(ids);
						query.setProjectId(view.getProjectId());
						query.setQuestionId(questionId);
						// 图片上传和签名需要做一个合并
						view.getAttachment().addAll(fileService.listFiles(query));
					}
					else if (questionType == SurveySchema.QuestionType.Dept) {
						view.setDepts(ids
								.stream().map(id -> deptService.listDept(null).stream()
										.filter(x -> x.getId().equals(id)).findFirst().orElseGet(DeptView::new))
								.collect(Collectors.toList()));
					}
				});
			}
		});
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
		FlatSurveySchemaByType schemaByType = parseSurveySchemaByType(project.getSurvey());
		setAnswerExtraInfo(answerView, schemaByType);
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
		String idempotencyKey = buildSubmitIdempotencyKey(request);
		if (idempotencyKey == null) {
			return createAnswer(request);
		}
		Object lock = submitLocks.computeIfAbsent(idempotencyKey, key -> new Object());
		synchronized (lock) {
			try {
				AnswerView replayed = replayRecentSubmit(idempotencyKey);
				if (replayed != null) {
					return replayed;
				}
				AnswerView created = createAnswer(request);
				rememberSubmit(idempotencyKey, created);
				return created;
			}
			finally {
				submitLocks.remove(idempotencyKey, lock);
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
		answer.setMetaInfo(enrichMetaInfo(answer.getMetaInfo()));
		save(beforeSaveAnswer(answer));
		rebuildAnswerItems(answer);
		return answerViewMapper.toView(answer);
	}

	/**
	 * 提交幂等键 = 项目 + 答题人 + 答案指纹。
	 *
	 * <p>
	 * 刻意不加数据库唯一键：存量库里本来就可能有重复答卷（历史 bug 已经产生过），唯一索引会让
	 * 迁移直接失败；而且「网络重试」和「用户真的想再交一次」在库里无法区分。所以这里只做应用层的
	 * 15 秒窗口合并 —— 防的是双击与重试这类误操作，不是强一致保证（服务重启/多实例即失效）。
	 *
	 * <p>
	 * 返回 null 表示本次不做幂等：显式「再考一次」、题库练习、以及拿不到可信答题人身份的情况。
	 */
	/** 投影写失败不应该让交卷失败：统计侧有「覆盖数不足就回退内存算法」的兜底 */
	private void rebuildAnswerItems(Answer answer) {
		try {
			answerItemProjector.rebuild(answer);
		}
		catch (Exception e) {
			log.warn("重建答卷明细失败（不影响交卷，统计会回退内存算法）: answerId={}", answer == null ? null : answer.getId(),
					e);
		}
	}

	private String buildSubmitIdempotencyKey(AnswerRequest request) {
		// 「再考一次」是用户显式要一条新答卷，必须绕过幂等
		if (Boolean.TRUE.equals(request.getFreshAttempt())) {
			return null;
		}
		String projectId = request.getProjectId();
		if (!StringUtils.hasText(projectId) || ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)) {
			return null;
		}
		String actor = resolveSubmitActor(projectId);
		if (!StringUtils.hasText(actor)) {
			// 既没登录、也没有设备 cookie：无法安全区分「同一个人的两次提交」和「两个人的相同答案」，
			// 宁可放弃合并，也不能把别人的答卷回放给你。
			return null;
		}
		// 答案内容必须一致才合并：用户真改了答案立刻再交，仍然要产生新答卷
		int fingerprint = Objects.hash(request.getAnswer(), request.getTempSave());
		return projectId + "|" + actor + "|" + fingerprint;
	}

	/**
	 * 提交幂等用的「答题人」标识：登录用户 → 设备限次 cookie → 考试模式退化为 IP+UA。
	 *
	 * <p>
	 * 匿名且没有设备 cookie 时只有考试模式才用 IP+UA 兜底：考试重复交卷的代价更高；
	 * 问卷模式不合并，否则同一个教室 NAT 下两个答案相同的受访者会被吞掉一份。
	 */
	private String resolveSubmitActor(String projectId) {
		String userId = SecurityContextUtils.getUserId();
		if (StringUtils.hasText(userId)) {
			return "u:" + userId;
		}
		HttpServletRequest httpRequest = currentRequestQuietly();
		if (httpRequest == null) {
			return null;
		}
		Cookie limitCookie = WebUtils.getCookie(httpRequest, AppConsts.COOKIE_LIMIT_NAME);
		if (limitCookie != null && StringUtils.hasText(limitCookie.getValue())) {
			return "c:" + limitCookie.getValue();
		}
		ProjectView project = projectService.getProject(projectId);
		if (project != null && ProjectModeEnum.exam.equals(project.getMode())
				&& !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)) {
			String ip = IPUtils.getClientIpAddress(httpRequest);
			if (StringUtils.hasText(ip)) {
				String agent = httpRequest.getHeader("User-Agent");
				return "ip:" + ip + "|" + (agent == null ? "" : Integer.toHexString(agent.hashCode()));
			}
		}
		return null;
	}

	private HttpServletRequest currentRequestQuietly() {
		try {
			return ContextHelper.getCurrentHttpRequest();
		}
		catch (Exception e) {
			return null;
		}
	}

	/** 窗口内重复提交：直接回放第一次的应答（连 examScore 一起回放，前端拿到的结果一致） */
	private AnswerView replayRecentSubmit(String idempotencyKey) {
		RecentSubmit recent = recentSubmits.get(idempotencyKey);
		if (recent == null) {
			return null;
		}
		if (System.currentTimeMillis() - recent.at > SUBMIT_IDEMPOTENCY_WINDOW_MS) {
			recentSubmits.remove(idempotencyKey, recent);
			return null;
		}
		AnswerView view = new AnswerView();
		view.setId(recent.answerId);
		view.setExamScore(recent.examScore);
		view.setExamInfo(recent.examInfo);
		return view;
	}

	private void rememberSubmit(String idempotencyKey, AnswerView created) {
		long now = System.currentTimeMillis();
		recentSubmits.put(idempotencyKey,
				new RecentSubmit(created.getId(), created.getExamScore(), created.getExamInfo(), now));
		if (recentSubmits.size() > SUBMIT_IDEMPOTENCY_MAX_ENTRIES) {
			recentSubmits.entrySet().removeIf(entry -> now - entry.getValue().at > SUBMIT_IDEMPOTENCY_WINDOW_MS);
		}
	}

	/**
	 * 补齐答卷的来源信息（IP / 设备 cookie），供「每 IP 限次」「每台设备限次」统计使用。
	 * 已有值不覆盖；取不到请求上下文（如异步线程）时原样返回。
	 */
	private AnswerMetaInfo enrichMetaInfo(AnswerMetaInfo metaInfo) {
		AnswerMetaInfo meta = metaInfo == null ? new AnswerMetaInfo() : metaInfo;
		try {
			javax.servlet.http.HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
			if (request == null) {
				return meta;
			}
			AnswerMetaInfo.ClientInfo client = meta.getClientInfo();
			if (client == null) {
				client = new AnswerMetaInfo.ClientInfo();
				meta.setClientInfo(client);
			}
			if (!org.springframework.util.StringUtils.hasText(client.getRemoteIp())) {
				client.setRemoteIp(cn.surveyking.server.core.uitls.IPUtils.getClientIpAddress(request));
			}
			if (!org.springframework.util.StringUtils.hasText(client.getCookie())) {
				javax.servlet.http.Cookie limitCookie = org.springframework.web.util.WebUtils.getCookie(request,
						AppConsts.COOKIE_LIMIT_NAME);
				if (limitCookie != null) {
					client.setCookie(limitCookie.getValue());
				}
			}
		}
		catch (Exception ignored) {
			// 补齐失败不影响提交
		}
		return meta;
	}

	@Override
	public long count(AnswerQuery query) {
		return count(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, query.getProjectId())
				.ge(query.getStartTime() != null, Answer::getCreateAt, query.getStartTime())
				.lt(query.getEndTime() != null, Answer::getCreateAt, query.getEndTime())
				.eq(query.getCreateBy() != null, Answer::getCreateBy, query.getCreateBy())
				.like(query.getIp() != null, Answer::getMetaInfo, query.getIp())
				.like(query.getValueQuery() != null, Answer::getAnswer, query.getValueQuery())
				.like(query.getCookie() != null, Answer::getMetaInfo, query.getCookie()));
	}

	@Override
	public AnswerView updateAnswer(AnswerRequest request) {
		Answer answer = beforeSaveAnswer(answerViewMapper.fromRequest(request));
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
		if (query.getPageSize() != 0) {
			answerQuery.setCurrent(query.getCurrent());
			answerQuery.setPageSize(query.getPageSize());
		}
		else {
			answerQuery.setPageSize(Integer.MAX_VALUE);
		}
		List<AnswerView> answerViews = listAnswer(answerQuery).getList();

		DownloadData download = new DownloadData();
		download.setFileName(project.getName() + ".xlsx");
		try {
			PipedOutputStream outputStream = new PipedOutputStream();
			PipedInputStream inputStream = new PipedInputStream(outputStream);
			Locale locale = LocaleContextHolder.getLocale();
			try {
				EXPORT_POOL.execute(() -> {
					Locale previousLocale = LocaleContextHolder.getLocale();
					try {
						LocaleContextHolder.setLocale(locale);
						export(project, answerViews, outputStream);
					}
					catch (Exception e) {
						e.printStackTrace();
					}
					finally {
						try {
							outputStream.close();
						}
						catch (IOException e) {
							e.printStackTrace();
						}
						LocaleContextHolder.setLocale(previousLocale);
					}
				});
			}
			catch (RejectedExecutionException rejected) {
				// 队列满：明确拒绝，别让第三份大导出把堆打穿
				try {
					outputStream.close();
				}
				catch (IOException ignored) {
					// 关闭管道失败不影响返回错误
				}
				throw new InternalServerError("当前导出任务过多，请稍后再试（同时最多 3 个）");
			}
			download.setResource(new InputStreamResource(inputStream));
		}
		catch (IOException e) {
			e.printStackTrace();
		}

		download.setMediaType(MediaType.parseMediaType("application/vnd.ms-excel"));
		return download;
	}

	/**
	 * 下载附件要使用 InputStreamResource，避免 Byte... 加载到内存
	 * @param query
	 * @return
	 */
	@Override
	public DownloadData downloadAttachment(DownloadQuery query) {
		Project project = projectMapper.selectById(query.getProjectId());
		DownloadData downloadData = new DownloadData();
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setIds(query.getIds());
		answerQuery.setProjectId(query.getProjectId());
		answerQuery.setStartTime(query.getStartTime());
		answerQuery.setEndTime(query.getEndTime());
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
			return generateSurveyAttachment(project, listAnswer(answerQuery).getList().get(0));
		}
		else {
			// 下载所有问卷答案的附件
			downloadData.setResource(
					new InputStreamResource(answerAttachToZip(project, listAnswer(answerQuery).getList(), query)));
			downloadData.setFileName(project.getName() + ".zip");
			downloadData.setMediaType(MediaType.parseMediaType("application/zip"));
		}
		return downloadData;
	}

	@Override
	public List<AnswerView> listAnswerDeleted(AnswerQuery query) {
		List<AnswerView> list = answerViewMapper.toView(getBaseMapper().selectLogicDeleted(query.getProjectId()));
		Project project = projectMapper.selectById(query.getProjectId());
		FlatSurveySchemaByType schemaByType = parseSurveySchemaByType(project.getSurvey());
		list.forEach(view -> setAnswerExtraInfo(view, schemaByType));
		return list;
	}

	@Override
	public void batchDestroyAnswer(AnswerRequest request) {
		answerAccessGuard.assertAnswersAccess(request.getIds());
		this.getBaseMapper().batchDestroy(request.getIds());
	}

	@Override
	public void restoreAnswer(AnswerRequest request) {
		answerAccessGuard.assertAnswersAccess(request.getIds());
		this.getBaseMapper().restoreAnswer(request.getIds());
	}

	@Override
	@SneakyThrows
	public AnswerUploadView upload(AnswerUploadRequest request) {
		if (request.getProjectId() != null) {
			answerAccessGuard.assertProjectAccess(request.getProjectId());
		}
		ExcelImportSecurity.validateFile(request.getFile());
		ExcelImportSecurity.RowGuard rowGuard = ExcelImportSecurity.newRowGuard();
		AnswerUploadView view = new AnswerUploadView();
		try (InputStream is = request.getFile().getInputStream(); ReadableWorkbook wb = new ReadableWorkbook(is)) {
			Sheet sheet = wb.getFirstSheet();
			String name = request.getFile().getOriginalFilename().substring(0,
					request.getFile().getOriginalFilename().lastIndexOf("."));
			List<Answer> answers = new ArrayList<>();
			try (Stream<Row> rows = sheet.openStream()) {
				// 第一行作为行头
				rows.forEach(r -> {
					rowGuard.validate(r);
					int rowNum = r.getRowNum();
					if (rowNum == 1) {
						if (request.getProjectId() != null) {
							ProjectView projectView = projectService.getProject(request.getProjectId());
							view.setProjectId(projectView.getId());
							view.setSchema(filterSchemaByRow(r, projectView.getSurvey()));
						}
						else if (Boolean.TRUE.equals(request.getAutoSchema())) {
							ProjectView projectView = parseRow2Schema(r, name, request.getParentId());
							view.setProjectId(projectView.getId());
							view.setSchema(projectView.getSurvey());
						}
					}
					else {
						// 处理答案
						answers.add(parseRow2Answer(view, r));
						if (answers.size() == 1000) {
							saveBatch(answers);
							answers.clear();
						}
					}
				});
			}
			if (answers.size() > 0) {
				saveBatch(answers);
			}

		}
		return view;
	}

	@Override
	public PaginationResponse<ExerciseView> historyExercise(HistoryExerciseQuery query) {
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());
		super.page(page,
				Wrappers.<Answer>lambdaQuery()
						.eq(query.getProjectId() != null, Answer::getProjectId, query.getProjectId())
						.isNotNull(Answer::getExamExerciseType)
						// 只显示「真的动过」的记录：已交卷，或暂存里有内容。
						// 点一下「开始练习」就会建一条空 record，不滤掉的话练习记录里全是 0% 的空条目。
						.and(w -> w.eq(Answer::getTempSave, 1).or().isNotNull(Answer::getTempAnswer)
								.ne(Answer::getTempAnswer, ""))
						.eq(query.getTempSave() != null, Answer::getTempSave, query.getTempSave())
						.eq(Answer::getCreateBy, SecurityContextUtils.getUserId()).orderByDesc(Answer::getCreateAt));

		List<ExerciseView> list = page.getRecords().stream().map(x -> {
			ExerciseView view = new ExerciseView();
			view.setId(x.getId());
			view.setProjectName(x.getProjectId());
			view.setTempSave(x.getTempSave());
			view.setCreateAt(x.getCreateAt());
			view.setExamExerciseType(x.getExamExerciseType());
			view.setAnswerId(x.getId());
			SurveySchema schema = x.getSurvey();
			view.setProjectName(schema.getTitle());
			view.setRepoId(x.getRepoId());
			view.setPercent(0L);

			if (x.getSurvey() == null || x.getTempAnswer() == null || x.getSurvey().getChildren().isEmpty()) {
				return view;
			}
			int totalQuestions = x.getSurvey().getChildren().size();
			int answeredQuestions = x.getTempSave() == 1 ? x.getAnswer().size() : x.getTempAnswer().size();

			double percent = ((double) answeredQuestions / totalQuestions) * 100;
			view.setPercent(Math.round(percent));
			return view;
		}).collect(Collectors.toList());

		return new PaginationResponse<>(page.getTotal(), list);
	}

	@Override
	public void deleteExercise(AnswerRequest request) {
		if (request == null || CollectionUtils.isEmpty(request.getIds())) {
			return;
		}
		Set<String> exerciseIds = request.getIds().stream().filter(StringUtils::hasText)
				.collect(Collectors.toCollection(LinkedHashSet::new));
		if (exerciseIds.isEmpty()) {
			return;
		}
		long ownedExerciseCount = count(Wrappers.<Answer>lambdaQuery().in(Answer::getId, exerciseIds)
				.isNotNull(Answer::getExamExerciseType).eq(Answer::getCreateBy, SecurityContextUtils.getUserId()));
		if (ownedExerciseCount != exerciseIds.size()) {
			throw new AccessDeniedException("只能删除自己的练习记录");
		}
		super.remove(Wrappers.<Answer>lambdaQuery().in(Answer::getId, exerciseIds)
				.isNotNull(Answer::getExamExerciseType).eq(Answer::getCreateBy, SecurityContextUtils.getUserId()));
	}

	private DownloadData generateSurveyAttachment(Project project, AnswerView answer) {
		DownloadData downloadData = new DownloadData();
		List<FileView> files = answer.getAttachment();
		// 如果只有一个附件，则直接返回附件的结果
		if (files.size() == 1) {
			FileView attachment = files.get(0);
			downloadData.setFileName(attachment.getOriginalName());
			downloadData.setResource(fileService.loadFile(new FileQuery(attachment.getId())).getBody());
		}
		else {
			// 多个附件，压缩包
			downloadData.setResource(new InputStreamResource(
					answerAttachToZip(project, Collections.singletonList(answer), new DownloadQuery())));
			downloadData.setFileName(answer.getId() + ".zip");
			downloadData.setMediaType(MediaType.parseMediaType("application/zip"));
		}
		return downloadData;
	}

	/**
	 * 将单个问卷的附件转成 zip 压缩包
	 * @param answers
	 * @return
	 */
	private InputStream answerAttachToZip(Project project, List<AnswerView> answers, DownloadQuery query) {
		try {
			PipedOutputStream outputStream = new PipedOutputStream();
			PipedInputStream inputStream = new PipedInputStream(outputStream);
			Locale locale = LocaleContextHolder.getLocale();
			new Thread(() -> {
				Locale previousLocale = LocaleContextHolder.getLocale();
				try (ZipOutputStream zout = new ZipOutputStream(outputStream);) {
					LocaleContextHolder.setLocale(locale);
					int[] serialNum = { 0, 0 };
					List<SurveySchema> uploadQuestions = SchemaHelper.flatSurveySchema(project.getSurvey()).stream()
							.filter(qSchema -> SurveySchema.QuestionType.Upload.equals(qSchema.getType()))
							.collect(Collectors.toList());
					answers.forEach(answer -> {
						serialNum[1] = 0;
						answer.getAttachment().forEach(attachment -> {
							serialNum[0] += 1;
							serialNum[1] += 1;
							Resource resource = fileService.loadFile(new FileQuery(attachment.getId())).getBody();
							String parsedFileName = parseAttachmentNameByExp(answer, query.getNameExp(), attachment,
									serialNum, uploadQuestions);
							String entryName = sanitizeZipEntryName(parsedFileName, "attachment-" + serialNum[0]);
							ZipEntry entry = new ZipEntry(entryName);
							try (InputStream resourceInputStream = Objects.requireNonNull(resource).getInputStream()) {
								zout.putNextEntry(entry);
								byte[] buffer = new byte[8192];
								int read;
								while ((read = resourceInputStream.read(buffer)) != -1) {
									zout.write(buffer, 0, read);
								}
								zout.closeEntry();
							}
							catch (IOException e) {
								e.printStackTrace();
							}

						});
					});
					// 生成表格
					if (DownloadQuery.DownloadType.answerAttachment.equals(query.getType())) {
						ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
						export(project, answers, byteArrayOutputStream);
						ZipEntry entry = new ZipEntry(
								sanitizeZipEntryName(project.getName() + ".xlsx", "answers.xlsx"));
						zout.putNextEntry(entry);
						zout.write(byteArrayOutputStream.toByteArray());
					}
				}
				catch (Exception e) {
					throw new InternalServerError("生成压缩文件失败", e);
				}
				finally {
					LocaleContextHolder.setLocale(previousLocale);
				}
			}).start();
			return inputStream;
		}
		catch (Exception e) {
			throw new InternalServerError("生成压缩文件失败", e);
		}
	}

	private void export(Project project, List<AnswerView> answerViews, OutputStream outputStream) {
		List<SurveySchema> schemaDataTypes = SchemaHelper.flatSurveySchema(project.getSurvey());
		int[] indexArr = { 0 };
		new ExcelExporter.Builder().setSheetName(project.getName()).setOutputStream(outputStream)
				.setRows(answerViews.stream().map(answer -> {
					indexArr[0] = indexArr[0] += 1;
					return SchemaHelper.parseRowData(answer, schemaDataTypes, indexArr[0], project.getMode());
				}).collect(Collectors.toList()))
				.setColumns(SchemaHelper.parseColumns(schemaDataTypes, project.getMode())).build().exportToStream();
	}

	/**
	 * @param answerView 当前答案
	 * @param nameExp 附件名称表达式
	 * @param file 当前附件
	 * @param serialNum 序号
	 * @param uploadQuestions 问卷上传题 schema
	 * @return 新的附件名称
	 */
	private String parseAttachmentNameByExp(AnswerView answerView, String nameExp, FileView file, int[] serialNum,
			List<SurveySchema> uploadQuestions) {
		if (StringUtils.hasText(nameExp)) {
			String fileName = nameExp;
			LinkedHashMap<String, Object> answerMap = answerView.getAnswer();
			Pattern pattern = Pattern.compile("#\\{([a-zA-Z0-9]+)\\.?([a-zA-Z0-9]*)\\}");
			Matcher matcher = pattern.matcher(nameExp);
			String exp, questionId, optionId = null;
			while (matcher.find()) {
				int count = matcher.groupCount();
				exp = matcher.group(0);
				questionId = matcher.group(1);
				if (count > 1) {
					optionId = matcher.group(2);
				}
				String expValue = "";
				if (AttachmentNameVariableEnum.projectId.name().equals(questionId)) {
					expValue = answerView.getProjectId();
				}
				else if (AttachmentNameVariableEnum.serialNum.name().equals(questionId)) {
					expValue = serialNum[0] + "";
				}
				else if (AttachmentNameVariableEnum.serialNumInAnswer.name().equals(questionId)) {
					expValue = serialNum[1] + "";
				}
				else if (AttachmentNameVariableEnum.uploadDate.name().equals(questionId)) {
					SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd");
					expValue = sdf.format(answerView.getCreateAt());
				}
				else if (AttachmentNameVariableEnum.uploadDateTime.name().equals(questionId)) {
					SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmss");
					expValue = sdf.format(answerView.getCreateAt());
				}
				else if (AttachmentNameVariableEnum.sourceName.name().equals(questionId)) {
					expValue = getFileNameWithoutSuffix(file.getOriginalName());
				}
				else if (AttachmentNameVariableEnum.questionTitle.name().equals(questionId)) {
					for (SurveySchema uploadQuestion : uploadQuestions) {
						Object qValue = answerView.getAnswer().get(uploadQuestion.getId());
						if (qValue != null) {
							boolean fileInCurrentSchema = ((Map<String, List<String>>) qValue)
									.get(uploadQuestion.getChildren().get(0).getId()).stream()
									.filter(x -> x.equals(file.getId())).findFirst().isPresent();
							if (fileInCurrentSchema) {
								expValue = uploadQuestion.getTitle();
								break;
							}
						}
					}
				}
				else {
					// 问题变量
					Map<String, Object> questionValue = (Map<String, Object>) answerMap.get(questionId);

					if (questionValue != null) {
						// 单行文本表达式只有问题id #{xxxx}
						if (StringUtils.hasText(optionId)) {
							expValue = questionValue.get(optionId).toString();
						}
						else {
							// 多行文本会有选项id #{ancd.a3dx}
							expValue = questionValue.values().toArray()[0].toString();
						}
					}
				}

				fileName = StringUtils.replace(fileName, exp, expValue);
			}
			String suffix = getFileExtension(file.getOriginalName());
			// 返回解析之后的文件名字
			if (suffix != null) {
				return fileName + "." + suffix;
			}
			return fileName;
		}
		else {
			// 返回原始文件名字
			return file.getOriginalName();
		}
	}

	/**
	 * 获取文件后缀
	 * @param fileName 文件名称
	 * @return 文件后缀
	 */
	private String getFileExtension(String fileName) {
		String extension = null;
		int i = fileName.lastIndexOf('.');
		if (i > 0) {
			extension = fileName.substring(i + 1);
		}
		return extension;
	}

	private String getFileNameWithoutSuffix(String fileName) {
		String fileNameWithoutSuffix = null;
		int i = fileName.lastIndexOf('.');
		if (i > 0) {
			fileNameWithoutSuffix = fileName.substring(0, i);
		}
		return fileNameWithoutSuffix;
	}

	private String sanitizeZipEntryName(String fileName, String fallbackName) {
		String normalized = StringUtils.hasText(fileName) ? fileName.replace('\\', '/') : fallbackName;
		int lastSeparator = normalized.lastIndexOf('/');
		if (lastSeparator >= 0) {
			normalized = normalized.substring(lastSeparator + 1);
		}
		StringBuilder safeName = new StringBuilder();
		for (int i = 0; i < normalized.length(); i++) {
			char ch = normalized.charAt(i);
			if (ch < 0x20 || ch == 0x7f || ch == ':' || ch == '*' || ch == '?' || ch == '"' || ch == '<' || ch == '>'
					|| ch == '|') {
				safeName.append('_');
			}
			else {
				safeName.append(ch);
			}
		}
		String result = safeName.toString().replace("..", "_").trim();
		if (!StringUtils.hasText(result) || ".".equals(result) || "..".equals(result)) {
			result = fallbackName;
		}
		return result.length() > 200 ? result.substring(0, 200) : result;
	}

	/**
	 * 答案保存之前计算考试分值、每题得分情况
	 * @param answer
	 * @return
	 */
	private Answer beforeSaveAnswer(Answer answer) {
		ProjectView project = projectService.getProject(answer.getProjectId());
		Answer previousAnswer = StringUtils.hasText(answer.getId()) ? getById(answer.getId()) : null;
		// 考试模式下客户端递交的 schema 一律不落库（可伪造 examCorrectAnswer 刷分）
		AnswerTimer.dropClientSnapshotForExam(answer, project);
		AnswerTimer.AttemptStart attemptStart = AnswerTimer.resolveAttemptStart(answer, project, previousAnswer);
		assertWithinTimeLimit(answer, project, attemptStart);
		AnswerTimer.stampAttemptTime(answer, previousAnswer, attemptStart);
		SurveySchema answerSurvey = answer.getSurvey() != null ? answer.getSurvey()
				: previousAnswer != null && previousAnswer.getSurvey() != null ? previousAnswer.getSurvey()
						: project.getSurvey();
		fileService.validateAndBindAnswerFiles(answer.getProjectId(), answer.getId(), answerSurvey, answer.getAnswer(),
				previousAnswer == null ? null : previousAnswer.getAnswer());
		computeExamScore(answer, project, previousAnswer);
		updateLinkSurveyAnswer(answer, project);
		return answer;
	}

	/**
	 * 服务端裁决最长/最短答题时间。
	 *
	 * <p>
	 * 起点不再只认「库里的答卷」：首次提交也会拿到一个起点（客户端上报或估算），所以首次提交同样参与判定。
	 * 例外是 {@code estimated}（既没库里的答卷、客户端也没给开始时间）：这时硬判最短交卷会把每一次
	 * 首次提交都拒掉（耗时恒为 0），因此这种情况只记录不拦截。
	 */
	private static void assertWithinTimeLimit(Answer answer, ProjectView project, AnswerTimer.AttemptStart attemptStart) {
		if (project == null || project.getSetting() == null || project.getSetting().getExamSetting() == null) {
			return;
		}
		if (attemptStart == null) {
			return;
		}
		Integer maxMinutes = project.getSetting().getExamSetting().getMaxSubmitMinutes();
		Integer minMinutes = project.getSetting().getExamSetting().getMinSubmitMinutes();
		long now = System.currentTimeMillis();
		if (maxMinutes != null && maxMinutes > 0
				&& now > attemptStart.at + maxMinutes * 60_000L + SUBMIT_GRACE_MS) {
			throw new AccessDeniedException("本次考试已超过最长答题时间（" + maxMinutes + " 分钟），无法再提交");
		}
		// 最短交卷：只对「正式提交」生效，暂存草稿不受限；时间到点自动交卷也不该被挡，所以只判 tempSave=1
		boolean finalSubmit = Integer.valueOf(1).equals(answer.getTempSave());
		if (finalSubmit && minMinutes != null && minMinutes > 0 && !attemptStart.estimated) {
			long earliest = attemptStart.at + minMinutes * 60_000L;
			if (now < earliest) {
				long leftSec = Math.max(0, (earliest - now) / 1000);
				throw new AccessDeniedException(
						"需答满 " + minMinutes + " 分钟才能交卷，还剩 " + (leftSec / 60) + " 分 " + (leftSec % 60) + " 秒");
			}
		}
	}

	/**
	 * 计算考试分值。
	 *
	 * <p>
	 * 判分用的 schema **只能来自服务端**：库里已存的快照（随机卷由 loadProject 时的服务端逻辑写入）
	 * → 项目 schema。绝不使用请求体/请求映射出来的 {@code answer.getSurvey()}，否则客户端伪造
	 * {@code examCorrectAnswer} 就能刷满分。
	 *
	 * <p>
	 * 历史答卷快照缺失时仍然回退到项目 schema（保持原有兼容行为）。
	 */
	private void computeExamScore(Answer answer, ProjectView project, Answer previousAnswer) {
		if (project != null && ProjectModeEnum.exam.equals(project.getMode()) && answer != null
				&& answer.getAnswer() != null && !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(project.getId())) {
			SurveySchema srcSchema = trustedScoreSchema(project, previousAnswer);
			if (srcSchema == null) {
				return;
			}
			AnswerScoreEvaluator evaluator = new AnswerScoreEvaluator(srcSchema, answer.getAnswer());
			answer.setExamScore(evaluator.eval());
			AnswerExamInfo examInfo = new AnswerExamInfo();
			examInfo.setQuestionScore(evaluator.getQuestionScore());
			answer.setExamInfo(examInfo);
		}
	}

	/**
	 * 判分 schema 的唯一出口：服务端快照优先（随机卷），否则项目 schema。
	 *
	 * @param project 服务端项目视图
	 * @param previousAnswer 库里已存的答卷（可能带随机卷快照），可空
	 */
	private static SurveySchema trustedScoreSchema(ProjectView project, Answer previousAnswer) {
		if (previousAnswer != null && previousAnswer.getSurvey() != null) {
			return previousAnswer.getSurvey();
		}
		return project == null ? null : project.getSurvey();
	}

	/**
	 * 更新原始问卷答案
	 * @param answer
	 * @param project
	 */
	private void updateLinkSurveyAnswer(Answer answer, ProjectView project) {
		SchemaHelper.flatSurveySchema(project.getSurvey()).stream()
				// children 为空的题（填空/多行文本/评分/NPS/多空等）没有选项，取 get(0) 会越界，
				// 导致「任何含填空题的问卷提交直接 500」，这里必须先判空
				.filter(qSchema -> !CollectionUtils.isEmpty(qSchema.getChildren())
						&& !CollectionUtils.isEmpty(qSchema.getChildren().get(0).getLinkSurveys()))
				.forEach(qSchemaHasLinkSurvey -> {
					Map<String, Object> qValue = (Map<String, Object>) answer.getAnswer()
							.get(qSchemaHasLinkSurvey.getId());
					if (qValue == null) {
						return;
					}
					SurveySchema optionSchemaHasLinkAttr = qSchemaHasLinkSurvey.getChildren().get(0);
					optionSchemaHasLinkAttr.getLinkSurveys().forEach(linkSurvey -> {
						if (Boolean.TRUE.equals(linkSurvey.getEnableUpdate())) {
							Object optionValue = qValue.get(optionSchemaHasLinkAttr.getId());
							Answer linkedAnswer = this.getOne(Wrappers.<Answer>lambdaQuery()
									.eq(Answer::getProjectId, linkSurvey.getLinkSurveyId())
									.like(Answer::getAnswer,
											SchemaHelper.buildLinkLikeCondition(linkSurvey, optionValue))
									.orderByDesc(Answer::getCreateAt).last("limit 1"));
							if (linkedAnswer != null) {
								// 修改
								for (SurveySchema.LinkField linkField : linkSurvey.getLinkFields()) {
									SchemaHelper.setQuestionValue(linkedAnswer.getAnswer(),
											linkField.getLinkQuestionId(), linkField.getLinkOptionId(),
											SchemaHelper.getQuestionValue(answer.getAnswer(),
													linkField.getFillQuestionId(), linkField.getFillOptionId()));
								}
								this.updateById(linkedAnswer);
							}
							else {
								// 添加
								Answer addAnswer = new Answer();
								BeanUtils.copyProperties(answer, addAnswer, "id", "examScore", "examInfo", "answer",
										"projectId");
								addAnswer.setProjectId(linkSurvey.getLinkSurveyId());
								LinkedHashMap addAnswerMap = new LinkedHashMap();
								addAnswer.setAnswer(addAnswerMap);
								SchemaHelper.setQuestionValue(addAnswerMap, linkSurvey.getLinkQuestionId(),
										linkSurvey.getLinkOptionId(), optionValue);
								for (SurveySchema.LinkField linkField : linkSurvey.getLinkFields()) {
									SchemaHelper.setQuestionValue(addAnswerMap, linkField.getLinkQuestionId(),
											linkField.getLinkOptionId(),
											SchemaHelper.getQuestionValue(answer.getAnswer(),
													linkField.getFillQuestionId(), linkField.getFillOptionId()));
								}
								this.save(addAnswer);
							}
						}
					});
				});
	}

	private ProjectView parseRow2Schema(Row row, String name, String parentId) {
		// 处理行头自动生成 schema
		SurveySchema schema = createSurveyFromExcelRowHeader(row);
		schema.setTitle(name);
		ProjectRequest projectRequest = new ProjectRequest();
		projectRequest.setSurvey(schema);
		projectRequest.setName(name);
		projectRequest.setMode(ProjectModeEnum.survey);
		projectRequest.setParentId(parentId);
		projectRequest.setSetting(ProjectSetting.builder().mode(ProjectModeEnum.survey).status(1).build());
		return projectService.addProject(projectRequest);
	}

	private SurveySchema createSurveyFromExcelRowHeader(Row row) {
		Set<String> ids = new HashSet<>();
		SurveySchema schema = SurveySchema.builder()
				.children(row.stream()
						.map(cell -> SurveySchema.builder().id(NanoIdUtils.randomNanoId(4, ids))
								.type(SurveySchema.QuestionType.FillBlank).title(cell.getText())
								.children(Collections.singletonList(
										SurveySchema.builder().id(NanoIdUtils.randomNanoId(4, ids)).build()))
								.build())
						.collect(Collectors.toList()))
				.build();
		return schema;
	}

	private SurveySchema filterSchemaByRow(Row row, SurveySchema schema) {
		List<SurveySchema> flatSurveySchema = SchemaHelper.flatSurveySchema(schema);
		return SurveySchema.builder().id(schema.getId()).children(row.stream().map(cell -> {
			String title = cell.getText();
			return flatSurveySchema.stream().filter(x -> x.getTitle().equals(title)).findFirst()
					.orElse(SurveySchema.builder().build());
		}).collect(Collectors.toList())).build();
	}

	private Answer parseRow2Answer(AnswerUploadView view, Row r) {
		Answer answer = new Answer();
		answer.setProjectId(view.getProjectId());
		LinkedHashMap<String, Map<String, String>> answerMap = new LinkedHashMap();
		int i = 0;
		for (SurveySchema questionSchema : view.getSchema().getChildren()) {
			String cellValue = r.getCellText(i);
			String questionId = questionSchema.getId();
			if (questionSchema.getChildren() == null || questionSchema.getChildren().size() == 0) {
				continue;
			}
			String optionId = questionSchema.getChildren().get(0).getId();
			if (cellValue != null) {
				Map<String, String> optionValue = new LinkedHashMap<>();
				optionValue.put(optionId, cellValue);
				answerMap.put(questionId, optionValue);
			}
			i++;
		}
		answer.setAnswer(answerMap);
		return answer;
	}

	/** 幂等回放需要的最小应答快照（此刻数据库可能还没提交完成，读不到行） */
	private static final class RecentSubmit {

		private final String answerId;

		private final Double examScore;

		private final AnswerExamInfo examInfo;

		private final long at;

		private RecentSubmit(String answerId, Double examScore, AnswerExamInfo examInfo, long at) {
			this.answerId = answerId;
			this.examScore = examScore;
			this.examInfo = examInfo;
			this.at = at;
		}

	}

}
