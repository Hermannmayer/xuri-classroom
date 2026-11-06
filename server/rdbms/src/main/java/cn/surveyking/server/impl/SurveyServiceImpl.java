package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.Tuple2;
import cn.surveyking.server.core.constant.*;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.security.JwtTokenUtil;
import cn.surveyking.server.core.security.SurveyWechatCookieService;
import cn.surveyking.server.core.uitls.*;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.ProjectViewMapper;
import cn.surveyking.server.domain.model.*;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.RepoPartnerService;
import cn.surveyking.server.service.SurveyService;
import cn.surveyking.server.service.SystemService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.web.util.WebUtils;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.validation.ValidationException;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * @author javahuang
 * @date 2021/8/22
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class SurveyServiceImpl implements SurveyService {

	private final ProjectService projectService;

	private final ProjectViewMapper projectViewMapper;

	private final AnswerServiceImpl answerService;

	private final ProjectPartnerMapper projectPartnerMapper;

	private final AuthenticationManager authenticationManager;

	private final JwtTokenUtil jwtTokenUtil;

	private final DictItemServiceImpl dictItemService;

	private final RepoServiceImpl repoService;

	private final UserBookServiceImpl userBookService;

	private final TemplateServiceImpl templateService;

	private final ObjectMapper objectMapper;

	private final RandomSurveyProcessor randomSurveyProcessor;

	private final MessageSource messageSource;

	private final RepoPartnerService repoPartnerService;

	private final SystemService systemService;

	private final SurveyWechatCookieService surveyWechatCookieService;

	/**
	 * answerService 如果需要验证密码，则只有密码输入正确之后才开始加载 schema
	 * @param query
	 * @return
	 */
	@Override
	public PublicProjectView loadProject(ProjectQuery query) {
		ProjectView project = projectService.getProject(query.getId());
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		PublicProjectView projectView = projectViewMapper.toPublicProjectView(project);
		if (wechatAccessRequired(project)) {
			projectView.setSurvey(null);
			projectView.setWechatAuthorizationRequired(isWechatOfficialEnabled() && isWechatRequest());
			projectView.setIsAuthenticated(SecurityContextUtils.isAuthenticated());
			return projectView;
		}
		SurveySchema loginFormSchema = null;
		// 题库练习，从题库加载题目
		if (query.getRepoId() != null) {
			RepoView repo = repoService.getRpo(query.getRepoId());
			if (repo == null || !Boolean.TRUE.equals(repo.getIsPractice())) {
				throw new AccessDeniedException("无权限访问该题库练习");
			}
			if (!repoPartnerService.hasPracticePermission(query.getRepoId(), SecurityContextUtils.getUserId())) {
				throw new AccessDeniedException("无权限访问该题库练习");
			}
			Answer answer = answerService.getOne(Wrappers.<Answer>lambdaQuery()
					.eq(StringUtils.isNotBlank(query.getAnswerId()), Answer::getId, query.getAnswerId())
					.eq(Answer::getCreateBy, SecurityContextUtils.getUserId())
					.eq(StringUtils.isBlank(query.getAnswerId()), Answer::getTempSave, 0)
					.eq(StringUtils.isBlank(query.getAnswerId()), Answer::getRepoId, query.getRepoId())
					.eq(StringUtils.isBlank(query.getAnswerId()), Answer::getExamExerciseType,
							query.getExamExerciseType())
					.last("limit 1"));
			if (answer != null) {
				projectView.setAnswerId(answer.getId());
				projectView.setAnswer(Optional.ofNullable(answer.getAnswer()).orElse(answer.getTempAnswer()));
				// 用于前端判断题目是否已答，及是否正确或者失败
				projectView.setExamInfo(answer.getExamInfo());
				if (answer.getSurvey() != null) {
					projectView.setSurvey(answer.getSurvey());
				}
			}
			else {
				// 创建一条答案数据
				// 题库顺序练习
				List<SurveySchema> questionList = new ArrayList<>();
				if (query.getExamExerciseType() == ExamExerciseTypeEnum.O
						|| query.getExamExerciseType() == ExamExerciseTypeEnum.R) {
					questionList = templateService.list(Wrappers.<Template>lambdaQuery().select(Template::getId)
							.eq(Template::getRepoId, query.getRepoId())).stream().map(t -> {
								SurveySchema question = new SurveySchema();
								question.setId(t.getId());
								return question;
							}).collect(Collectors.toList());
				}
				if (query.getExamExerciseType() == ExamExerciseTypeEnum.R) {
					Collections.shuffle(questionList);
				}
				if (query.getExamExerciseType() == ExamExerciseTypeEnum.W) {
					questionList = userBookService.list(Wrappers.<UserBook>lambdaQuery().select(UserBook::getTemplateId)
							.eq(UserBook::getRepoId, query.getRepoId())
							.eq(UserBook::getCreateBy, SecurityContextUtils.getUserId()).gt(UserBook::getWrongTimes, 0))
							.stream().map(t -> {
								SurveySchema question = new SurveySchema();
								question.setId(t.getTemplateId());
								return question;
							}).collect(Collectors.toList());
				}
				SurveySchema survey = SurveySchema.builder().id(query.getRepoId()).title(repo.getName())
						.attribute(SurveySchema.Attribute.builder().mode(SurveySchema.SchemaMode.exam)
								.submitButton(i18n("survey.practice.finish")).build())
						.children(questionList).build();
				Answer answer2save = new Answer();
				answer2save.setSurvey(survey);
				answer2save.setRepoId(query.getRepoId());
				answer2save.setTempSave(0);
				answer2save.setProjectId(ExerciseProjectTemplate.EXERCISE_PROJECT_ID);
				answer2save.setExamExerciseType(query.getExamExerciseType());
				answer2save.setCreateBy(SecurityContextUtils.getUserId());
				answerService.save(answer2save);
				projectView.setSurvey(survey);
				projectView.setAnswerId(answer2save.getId());
			}
			return projectView;
		}
		else if (query.getAnswerId() == null) {
			// 表单需要验证
			loginFormSchema = convertAndValidateLoginFormIfNeeded(project, null);
			// 校验问卷
			validateProject(project);
		}
		else {
			// 直接根据答案加载出 schema
			AnswerView answerView = getAnswerForProject(project.getId(), query.getAnswerId());
			if (answerView != null) {
				projectView.setAnswerId(answerView.getId());
				projectView.setMetaInfo(answerView.getMetaInfo());
				projectView.setAnswer(answerView.getAnswer());
				if (answerView.getSurvey() != null) {
					// 随机问题
					projectView.setSurvey(answerView.getSurvey());
				}
			}
			return projectView;
		}

		// 如果需要登录，将问卷 schema 替换成登录表单的 schema
		if (loginFormSchema != null) {
			projectView.setSurvey(loginFormSchema);
			projectView.setLoginRequired(true);
		}
		else {
			// 随机问题
			randomSurveyProcessor.processRandomSurvey(project, projectView);
			// replaceSchemaIfRandomSchema(project, projectView);
			// 允许修改答案
			projectView.setAnswer(getLatestAnswer(projectView, null));
		}
		projectView.setIsAuthenticated(SecurityContextUtils.isAuthenticated());
		return projectView;
	}

	/** 首屏只返回必要的大纲元数据，不返回任何题干、选项或题目属性。 */
	@Override
	public PublicProjectView loadProjectOutline(ProjectQuery query) {
		return toOutlineView(loadProject(query));
	}

	@Override
	public PublicProjectView validateProjectOutline(ProjectQuery query) {
		return toOutlineView(validateProject(query));
	}

	private PublicProjectView toOutlineView(PublicProjectView view) {
		// 登录表单本身不是考试题目，保留它以支持原有用户名/白名单交互。
		if (view == null || view.getSurvey() == null || Boolean.TRUE.equals(view.getLoginRequired())) {
			return view;
		}
		SurveySchema survey = view.getSurvey();
		List<PublicQuestionOutline> outline = new ArrayList<>();
		List<SurveySchema> questions = SchemaHelper.flatSurveySchema(survey);
		int number = 0;
		for (SurveySchema question : questions) {
			PublicQuestionOutline item = new PublicQuestionOutline();
			item.setId(question.getId());
			item.setType(question.getType());
			item.setNumber(++number);
			item.setRequired(question.getAttribute() != null && Boolean.TRUE.equals(question.getAttribute().getRequired()));
			outline.add(item);
		}
		view.setOutline(outline);
		SurveySchema shell = new SurveySchema();
		shell.setId(survey.getId());
		shell.setTitle(survey.getTitle());
		shell.setType(survey.getType());
		shell.setAttribute(survey.getAttribute());
		shell.setChildren(new ArrayList<SurveySchema>());
		view.setSurvey(shell);
		return view;
	}

	/**
	 * 按题目 id 下发单题。先走与首屏相同的 loadProject 校验，确保 questionId 存在于当前项目或
	 * 当前答卷的随机卷快照中；不会相信客户端给出的任意题目 id，也不使用无校验的 answerId 查询。
	 */
	@Override
	public SurveySchema loadPublicQuestion(PublicQuestionRequest request) {
		if (request == null || StringUtils.isBlank(request.getId()) || StringUtils.isBlank(request.getQuestionId())) {
			throw new IllegalArgumentException("缺少问卷或题目标识");
		}
		ProjectQuery query = new ProjectQuery();
		query.setId(request.getId());
		query.setAnswerId(request.getAnswerId());
		PublicProjectView view = loadProject(query);
		if (view.getSurvey() == null) {
			throw new AccessDeniedException("当前问卷尚未完成访问验证");
		}
		SurveySchema match = findSchemaNode(view.getSurvey(), request.getQuestionId());
		if (match == null || !SchemaHelper.flatSurveySchema(view.getSurvey()).stream()
				.anyMatch(question -> request.getQuestionId().equals(question.getId()))) {
			throw new AccessDeniedException("题目不属于当前问卷");
		}
		SurveySchema question = match.deepCopy();
		// 练习模式（选完即判）：下发标准答案与解析给前端即时判题；分值仍然不下发。
		// 其它模式一律剥离答案与解析，避免考前泄题。
		boolean exerciseMode = view.getSetting() != null && view.getSetting().getExamSetting() != null
				&& Boolean.TRUE.equals(view.getSetting().getExamSetting().getExerciseMode());
		if (exerciseMode) {
			SchemaHelper.ignoreAttributes(question, "examScore", "examMatchRule");
		}
		else {
			SchemaHelper.ignoreAttributes(question, "examCorrectAnswer", "examScore", "examMatchRule", "examAnalysis");
		}
		// 闯关模式：把「本题限时秒数」下发，前端据此倒计时；超时判分在交卷时由服务端裁决
		if (view.getSetting() != null && view.getSetting().getExamSetting() != null
				&& Boolean.TRUE.equals(view.getSetting().getExamSetting().getPassMode())) {
			question.setTimeLimitSeconds(view.getSetting().getExamSetting().getPassModePerSeconds());
		}
		return question;
	}

	private SurveySchema findSchemaNode(SurveySchema root, String questionId) {
		if (root == null) {
			return null;
		}
		if (questionId.equals(root.getId())) {
			return root;
		}
		if (root.getChildren() != null) {
			for (SurveySchema child : root.getChildren()) {
				SurveySchema match = findSchemaNode(child, questionId);
				if (match != null) {
					return match;
				}
			}
		}
		return null;
	}

	/**
	 * 验证问卷
	 * @param query
	 * @return
	 */
	@Override
	public PublicProjectView validateProject(ProjectQuery query) {
		String projectId = query.getId();
		ProjectView project = projectService.getProject(projectId);
		requireWechatAccess(project);
		// 登录验证
		convertAndValidateLoginFormIfNeeded(project, query.getAnswer());
		PublicProjectView projectView = projectViewMapper.toPublicProjectView(project);
		// 随机问题
		randomSurveyProcessor.processRandomSurvey(project, projectView);
		// 校验问卷
		validateProject(project);
		projectView.setAnswer(getLatestAnswer(projectView, (String) SchemaHelper.getLoginFormAnswer(query.getAnswer(),
				SchemaHelper.LoginFormFieldEnum.whitelistName)));
		return projectView;
	}

	@Override
	public PublicStatisticsView statProject(ProjectQuery query) {
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setProjectId(query.getId());
		answerQuery.setPageSize(-1);
		List<AnswerView> answers = answerService.listAnswer(answerQuery).getList();
		ProjectView project = projectService.getProject(query.getId());
		return new ProjectStatHelper(project.getSurvey(), answers).stat();
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public PublicAnswerView saveAnswer(AnswerRequest request) {
		String projectId = request.getProjectId();
		PublicAnswerView result = new PublicAnswerView();
		ProjectView project = projectService.getProject(projectId);
		// 提交也要校验问卷状态/截止时间：此前只有 loadProject 挡，拿到 projectId 直接 POST 就能绕过
		validateSubmittable(project, !isNotBlank(request.getId()));
		// 密码 / 需要登录 / 白名单 / 开始时间：同样要在提交路径再判一次
		validateAnswerGate(project, !isNotBlank(request.getId()));
		SurveyWechatIdentity wechatIdentity = requireWechatAccess(project);
		applyWechatIdentity(project, request, wechatIdentity);
		String answerId = request.getId();
		// 随机问卷更新答案
		String randomSurveyCookieName = AppConsts.COOKIE_RANDOM_PROJECT_PREFIX + project.getId();
		String answerIdFromCookie = ContextHelper.getCookie(randomSurveyCookieName);
		if (isNotBlank(answerIdFromCookie)) {
			getAnswerForProject(projectId, answerIdFromCookie);
			answerId = answerIdFromCookie;
		}
		else if (isNotBlank(request.getQueryId())) {
			// 公开查询修改答案
			validateAndMergeAnswer(project, request);
		}
		else if (isNotBlank(request.getId())
				&& !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(request.getProjectId())) {
			// 传入答案ID 并且设置了允许修改答案，则可以修改问卷答案
			getAnswerForProject(projectId, request.getId());
			boolean enableUpdate = Boolean.TRUE.equals(project.getSetting().getSubmittedSetting().getEnableUpdate());
			// 暂存(tempSave=0)允许覆盖自己未提交的草稿，否则「答一半续上」会被 AnswerChangeDisabled 拦住
			boolean tempSaving = Integer.valueOf(0).equals(request.getTempSave());
			if (!enableUpdate && !tempSaving) {
				throw new ErrorCodeException(ErrorCode.AnswerChangeDisabled);
			}
		}
		else {
			// 「再考一次」= 新一轮作答：跳过「取本用户最近一份再 updateById」的复用逻辑，直接新建一条答卷，
			// 历史成绩保留；校验逻辑与原来一致（问卷是否可交、答案是否合法）。
			if (Boolean.TRUE.equals(request.getFreshAttempt())) {
				validateProject(project);
				validateAnswer(project, request);
			}
			else {
				// 问卷允许修改答案 开关修改答案
				AnswerView latestAnswer = validateAndGetLatestAnswer(project, request);
				if (latestAnswer != null) {
					answerId = latestAnswer.getId();
				}
			}
		}

		// 保存答案
		request.setId(answerId);
		AnswerView answerView = answerService.saveAnswer(request);
		result.setAnswerId(answerView.getId());
		// 闯关模式：服务端裁决超时题（计 0 分，并把每题用时/超时清单落到 metaInfo）
		applyPassModePenalty(project, request, answerView);
		// 考试模式，计算分值传给前端
		if (ProjectModeEnum.exam.equals(project.getMode())
				&& !ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId)) {
			result.setExamScore(answerView.getExamScore());
			result.setQuestionScore(answerView.getExamInfo().getQuestionScore());
			// 计算错题：带上本次答案与 schema，才能排除「未作答」并按考试维度归档
			AnswerExamInfo answerExamInfo = answerView.getExamInfo();
			LinkedHashMap<String, Double> questionScore = answerExamInfo.getQuestionScore();
			userBookService.saveWrongQuestion(questionScore, answerView.getAnswer(),
					answerView.getSurvey() != null ? answerView.getSurvey() : project.getSurvey(), project.getId(),
					null);
		}
		// 白名单更新答题信息
		request.setId(answerView.getId());
		updateProjectPartnerByAnswer(request, project);
		// 完事儿删除 cookie 标识
		if (isNotBlank(answerIdFromCookie)) {
			Cookie cookie = new Cookie(randomSurveyCookieName, answerIdFromCookie);
			cookie.setMaxAge(0);
			ContextHelper.getCurrentHttpResponse().addCookie(cookie);
		}
		return result;
	}

	/** 切屏计数的按键锁：同一份答卷的读-改-写串行化，避免并发丢更新 */
	private final java.util.concurrent.ConcurrentMap<String, Object> switchScreenLocks = new java.util.concurrent.ConcurrentHashMap<>();

	/**
	 * 切屏计数落库：累加到答卷 metaInfo.switchScreenTimes。
	 * 优先用前端传的 answerId（校验问卷归属）；没有答卷 id 时退回「本用户在这份问卷上最近一条记录」，
	 * 这样刷新页面后还能从 projectOutline 的 metaInfo 恢复计数。匿名且没有 answerId 时返回 0。
	 */
	@Override
	public Integer recordSwitchScreen(PublicSwitchScreenRequest request) {
		if (request == null || isBlank(request.getProjectId())) {
			throw new IllegalArgumentException("缺少问卷标识");
		}
		ProjectView project = projectService.getProject(request.getProjectId());
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		Answer answer = null;
		if (isNotBlank(request.getAnswerId())) {
			answer = answerService.getById(request.getAnswerId());
			if (answer == null || !Objects.equals(request.getProjectId(), answer.getProjectId())) {
				throw new AccessDeniedException("无权限访问该答案");
			}
		}
		else if (SecurityContextUtils.getUserId() != null) {
			answer = answerService.getOne(Wrappers.<Answer>lambdaQuery()
					.eq(Answer::getProjectId, request.getProjectId())
					.eq(Answer::getCreateBy, SecurityContextUtils.getUserId()).orderByDesc(Answer::getCreateAt)
					.last("limit 1"));
		}
		if (answer == null) {
			return 0;
		}
		// 读-改-写必须串行：并发实测里 10 次切屏只记到 1 次（10 个线程都读到 0 再各自 +1 覆盖）。
		// 这里按答卷 id 加 JVM 内锁。单实例部署下足够；将来多实例要改成 DB 原子自增
		// （MySQL 可用 JSON_SET，但 H2 不支持，所以没走 SQL 方案）。
		synchronized (switchScreenLocks.computeIfAbsent(answer.getId(), k -> new Object())) {
			Answer latest = answerService.getById(answer.getId());
			if (latest == null) {
				return 0;
			}
			AnswerMetaInfo metaInfo = latest.getMetaInfo() == null ? new AnswerMetaInfo() : latest.getMetaInfo();
			int times = metaInfo.getSwitchScreenTimes() == null ? 0 : metaInfo.getSwitchScreenTimes();
			times += 1;
			metaInfo.setSwitchScreenTimes(times);
			latest.setMetaInfo(metaInfo);
			answerService.updateById(latest);
			return times;
		}
	}

	/** 当前登录用户在这份试卷/问卷上的历次已提交答卷（按时间倒序），供「再考一次」的成绩列表使用 */
	@Override
	public List<PublicAttemptView> listPublicAttempts(PublicAttemptRequest request) {
		String userId = SecurityContextUtils.getUserId();
		if (request == null || isBlank(request.getProjectId()) || isBlank(userId)) {
			return Collections.emptyList();
		}
		return answerService
				.list(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, request.getProjectId())
						.eq(Answer::getCreateBy, userId).eq(Answer::getTempSave, 1).isNotNull(Answer::getAnswer)
						.orderByDesc(Answer::getCreateAt))
				.stream().map(answer -> {
					PublicAttemptView view = new PublicAttemptView();
					view.setAnswerId(answer.getId());
					view.setExamScore(answer.getExamScore());
					view.setCreateAt(answer.getCreateAt() == null ? null : answer.getCreateAt().getTime());
					return view;
				}).collect(Collectors.toList());
	}

	/**
	 * 闯关模式（passMode）超时裁决。
	 *
	 * 时间基准：逐题用时由前端计时（开始答题 → 答题/单题超时），随交卷放在
	 * {@link AnswerMetaInfo#getPassModeTimes()} 上报；**裁决与判分在服务端**：只要某题用时
	 * &gt;= passModePerSeconds（或前端明确标记了超时），就按超时处理。
	 *
	 * 判分口径：超时题在 examInfo.questionScore 里记 0 分，总分按各题分数重新求和；
	 * 非考试模式没有分值体系，只记录耗时与超时清单，不影响答案本身。
	 *
	 * @param project 项目
	 * @param request 提交请求（含前端上报的 metaInfo）
	 * @param answerView 已保存的答卷视图（方法内就地修正分数）
	 */
	private void applyPassModePenalty(ProjectView project, AnswerRequest request, AnswerView answerView) {
		ProjectSetting setting = project.getSetting();
		ProjectSetting.ExamSetting examSetting = setting == null ? null : setting.getExamSetting();
		AnswerMetaInfo metaInfo = request.getMetaInfo();
		if (examSetting == null || !Boolean.TRUE.equals(examSetting.getPassMode()) || metaInfo == null
				|| (CollectionUtils.isEmpty(metaInfo.getPassModeTimes())
						&& CollectionUtils.isEmpty(metaInfo.getPassModeTimeouts()))) {
			return;
		}
		Integer limit = examSetting.getPassModePerSeconds();
		Set<String> timeouts = new LinkedHashSet<>();
		if (metaInfo.getPassModeTimeouts() != null) {
			timeouts.addAll(metaInfo.getPassModeTimeouts());
		}
		if (limit != null && limit > 0 && metaInfo.getPassModeTimes() != null) {
			metaInfo.getPassModeTimes().forEach((questionId, spent) -> {
				if (spent != null && spent >= limit) {
					timeouts.add(questionId);
				}
			});
		}
		// 考试模式：超时题计 0 分，总分重新求和（答案本身保留，成绩单里仍能看到作答内容）
		if (ProjectModeEnum.exam.equals(project.getMode()) && answerView.getExamInfo() != null) {
			LinkedHashMap<String, Double> questionScore = answerView.getExamInfo().getQuestionScore();
			if (questionScore != null) {
				timeouts.forEach(questionId -> questionScore.put(questionId, 0.0D));
				double total = questionScore.values().stream().filter(Objects::nonNull)
						.mapToDouble(Double::doubleValue).sum();
				answerView.setExamScore(total);
			}
		}
		// 把耗时 / 超时清单落到答卷 metaInfo，便于成绩单与数据页追溯
		Answer saved = answerService.getById(answerView.getId());
		if (saved == null) {
			return;
		}
		AnswerMetaInfo savedMeta = saved.getMetaInfo() == null ? new AnswerMetaInfo() : saved.getMetaInfo();
		savedMeta.setPassModeTimes(metaInfo.getPassModeTimes());
		savedMeta.setPassModeTimeouts(new ArrayList<>(timeouts));
		saved.setMetaInfo(savedMeta);
		if (ProjectModeEnum.exam.equals(project.getMode())) {
			saved.setExamScore(answerView.getExamScore());
			saved.setExamInfo(answerView.getExamInfo());
		}
		answerService.updateById(saved);
	}

	/**
	 * @param request
	 * @return
	 */
	@Override
	@SneakyThrows
	public PublicQueryVerifyView loadQuery(PublicQueryRequest request) {
		Tuple2<ProjectView, ProjectSetting.PublicQuery> projectAndQuery = getProjectAndQueryThenValidate(request);
		SurveySchema schema = buildQueryFormSchema(projectAndQuery.getFirst(), projectAndQuery.getSecond());
		PublicQueryVerifyView view = new PublicQueryVerifyView();
		view.setSchema(schema);
		return view;
	}

	@Override
	public PublicQueryView getQueryResult(PublicQueryRequest request) {
		Tuple2<ProjectView, ProjectSetting.PublicQuery> projectAndQuery = getProjectAndQueryThenValidate(request);
		SurveySchema schema = buildQueryResultSchema(projectAndQuery.getFirst(), projectAndQuery.getSecond());
		PublicQueryView view = new PublicQueryView();
		view.setSchema(schema);
		List<Answer> answers = findAnswerByQuery(request, projectAndQuery);
		// 根据配置的权限信息过滤答案
		LinkedHashMap<String, Integer> fieldPermission = projectAndQuery.getSecond().getFieldPermission();
		view.setFieldPermission(fieldPermission);
		view.setAnswers(answers.stream().map(answer -> {
			filterAnswerByFieldPermission(answer.getAnswer(), fieldPermission);
			PublicAnswerView answerView = new PublicAnswerView();
			answerView.setAnswerId(answer.getId());
			answerView.setAnswer(answer.getAnswer());
			if (FieldPermissionType.visible.equals(fieldPermission.get("examScore"))
					|| FieldPermissionType.editable.equals(fieldPermission.get("examScore"))) {
				// 公开查询允许查询分值
				answer.getAnswer().put("examScore", Collections.singletonMap("examScore", answer.getExamScore()));
			}
			answerView.setCreateAt(answer.getCreateAt());
			return answerView;
		}).collect(Collectors.toList()));
		return view;
	}

	@Override
	public List<PublicDictView> loadDict(PublicDictRequest request) {
		int limit = Math.min(Math.max(request.getLimit() != null ? request.getLimit() : 50, 1), 100);
		return dictItemService
				.list(Wrappers.<CommDictItem>lambdaQuery().eq(CommDictItem::getDictCode, request.getDictCode())
						.eq(request.getCascaderLevel() != null, CommDictItem::getItemLevel, request.getCascaderLevel())
						.eq(request.getParentValue() != null, CommDictItem::getParentItemValue,
								request.getParentValue())
						.and(isNotBlank(request.getSearch()),
								i -> i.like(CommDictItem::getItemName, request.getSearch()).or()
										.like(CommDictItem::getItemValue, request.getSearch()))
						.last("limit " + limit))
				.stream().map(x -> {
					PublicDictView view = new PublicDictView();
					view.setLabel(x.getItemName());
					view.setValue(x.getItemValue());
					return view;
				}).collect(Collectors.toList());
	}

	/**
	 * 成绩查询页面获取成绩信息
	 * @param request
	 * @return
	 */
	@Override
	public PublicExamResult loadExamResult(PublicExamRequest request) {
		ProjectView project = projectService.getProject(request.getId());
		AnswerView answerView = getAnswerForProject(project.getId(), request.getAnswerId(),
				Boolean.TRUE.equals(project.getSetting().getSubmittedSetting().getRankVisible()));
		ProjectSetting.SubmittedSetting submittedSetting = project.getSetting().getSubmittedSetting();
		ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
		PublicExamResult result = new PublicExamResult();
		result.setName(project.getName());
		// 可以查看正确答案和解析;
		// 考试结束之后才可以查看正确答案和解析
		if (Boolean.TRUE.equals(submittedSetting.getAnswerAnalysis()) && examFinished(examSetting)) {
			result.setAnswer(answerView.getAnswer());
			result.setSchema(project.getSurvey());
			result.setExamInfo(answerView.getExamInfo());
		}
		// 显示成绩单
		if (Boolean.TRUE.equals(submittedSetting.getTranscriptVisible())) {
			result.setExamScore(answerView.getExamScore());
		}
		// 显示排名 TODO:显示排行榜
		if (Boolean.TRUE.equals(submittedSetting.getRankVisible())) {
			result.setRank(answerView.getRank());
		}
		// 随机问题：每个人拿到的题不同，必须用答卷上的快照
		if (answerView.getSurvey() != null) {
			// 但历史快照在保存时把 examCorrectAnswer 剥掉了（实测 378 个正确选项 → 0），
			// 用它会让解析页永远显示「未设置正确答案」。这种情况下回退到项目 schema，
			// 保证老答卷也能看到正确答案；只有快照里确实还带着答案时才优先用快照。
			if (containsCorrectAnswer(answerView.getSurvey())) {
				result.setSchema(answerView.getSurvey());
			}
		}
		result.setMetaInfo(answerView.getMetaInfo());
		return result;
	}

	/**
	 * 递归检查一份 schema 里是否还带着正确答案。
	 *
	 * <p>用途：判断答卷上那份 survey 快照能不能用来做答案解析。
	 * 历史快照在保存时被 {@code ignoreAttributes} 剥掉过 examCorrectAnswer，
	 * 这类快照不能用来渲染成绩单。
	 */
	private boolean containsCorrectAnswer(SurveySchema schema) {
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

	@Override
	public void tempSaveAnswer(AnswerRequest request) {
		String projectId = request.getProjectId();
		if (!Integer.valueOf(0).equals(request.getTempSave()) || request.getTempAnswer() == null || projectId == null) {
			return;
		}
		String answerId = ContextHelper.getCookie(AppConsts.COOKIE_RANDOM_PROJECT_PREFIX + projectId);
		if (answerId == null) {
			return;
		}
		if (!SecurityContextUtils.isAuthenticated()) {
			// 目前仅支持登录用户后端暂存
			return;
		}
		getAnswerForProject(projectId, answerId);
		AnswerRequest answerRequest = new AnswerRequest();
		answerRequest.setId(answerId);
		answerRequest.setTempSave(0);
		// updateAnswer 链路会按 projectId 取项目，漏传会 NPE
		answerRequest.setProjectId(projectId);
		answerRequest.setTempAnswer(request.getTempAnswer());
		answerService.updateAnswer(answerRequest);
	}

	@Override
	public PublicLinkResult loadLinkResult(PublicLinkRequest request) {
		PublicLinkResult result = new PublicLinkResult();
		ProjectView projectView = projectService.getProject(request.getProjectId());
		if (projectView == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		SurveySchema currentQuestionSchema = SchemaHelper.flatSurveySchema(projectView.getSurvey()).stream()
				.filter(x -> x.getId().equals(request.getQuestionId())).findFirst().orElseGet(() -> {
					SurveySchema surveySchema = new SurveySchema();
					surveySchema.setChildren(new ArrayList<>());
					return surveySchema;
				});

		List<SurveySchema.LinkSurvey> linkSurveys = currentQuestionSchema.getChildren().stream()
				.filter(x -> request.getOptionId().equals(x.getId())).findFirst().orElseGet(SurveySchema::new)
				.getLinkSurveys();
		if (linkSurveys == null) {
			throw new ErrorCodeException(ErrorCode.LinkConditionNotFound);
		}
		LinkedHashMap<String, Map<String, Object>> fillAnswer = new LinkedHashMap<>();
		result.setAnswer(fillAnswer);
		for (SurveySchema.LinkSurvey linkSurvey : linkSurveys) {
			Answer answer = answerService
					.getOne(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, linkSurvey.getLinkSurveyId())
							.like(Answer::getAnswer, buildLinkLikeCondition(linkSurvey, request.getValue()))
							.orderByDesc(Answer::getCreateAt).last("limit 1"));
			fillLinkFieldAndAnswer(answer != null ? answer.getAnswer() : null, linkSurvey.getLinkFields(), fillAnswer);
		}

		return result;
	}

	@SneakyThrows
	private String buildLinkLikeCondition(SurveySchema.LinkSurvey linkSurvey, Object value) {
		Map<String, Object> optionValue = new HashMap<>();
		optionValue.put(linkSurvey.getLinkOptionId(), value);
		// Map<String, Map<String, Object>> questionValue = new HashMap<>();
		// questionValue.put(linkSurvey.getLinkQuestionId(), optionValue);
		return StringUtils.substringBetween(objectMapper.writeValueAsString(optionValue), "{", "}");
	}

	public void fillLinkFieldAndAnswer(LinkedHashMap answer, List<SurveySchema.LinkField> linkFields,
			LinkedHashMap<String, Map<String, Object>> fillAnswer) {
		for (SurveySchema.LinkField linkField : linkFields) {
			Map<String, Object> questionValueMap = fillAnswer.computeIfAbsent(linkField.getFillQuestionId(),
					(k) -> new HashMap<>());
			if (answer == null) {
				continue;
			}
			Map<String, Object> linkQuestionValue = (Map<String, Object>) answer.get(linkField.getLinkQuestionId());
			if (linkQuestionValue == null) {
				continue;
			}
			questionValueMap.put(linkField.getFillOptionId(), linkQuestionValue.get(linkField.getLinkOptionId()));
		}
	}

	/**
	 * 判断考试是否结束，未设置默认为已结束
	 * @param examSetting
	 * @return
	 */
	private boolean examFinished(ProjectSetting.ExamSetting examSetting) {
		if (examSetting.getEndTime() == null || examSetting.getEndTime() < System.currentTimeMillis()) {
			return true;
		}
		return false;
	}

	private boolean wechatAccessRequired(ProjectView project) {
		if (!isWechatOnly(project)) {
			return false;
		}
		if (!isWechatRequest()) {
			return true;
		}
		if (!isWechatOfficialEnabled()) {
			return false;
		}
		return resolveSurveyWechatIdentity(project) == null;
	}

	private SurveyWechatIdentity requireWechatAccess(ProjectView project) {
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		if (!isWechatOnly(project)) {
			return null;
		}
		if (!isWechatRequest()) {
			throw new ValidationException("只能在微信中打开");
		}
		if (!isWechatOfficialEnabled()) {
			return null;
		}
		SurveyWechatIdentity identity = resolveSurveyWechatIdentity(project);
		if (identity == null) {
			throw new ValidationException("请先完成微信授权");
		}
		return identity;
	}

	private SurveyWechatIdentity resolveSurveyWechatIdentity(ProjectView project) {
		SurveyWechatIdentity identity = surveyWechatCookieService.resolve(ContextHelper.getCurrentHttpRequest());
		if (identity == null || !StringUtils.equals(project.getId(), identity.getProjectId())
				|| !StringUtils.isNotBlank(identity.getOpenId())) {
			return null;
		}
		ProjectSetting.AnswerSetting answerSetting = project.getSetting().getAnswerSetting();
		if (Boolean.TRUE.equals(answerSetting.getWechatUserInfo()) && !identity.isUserInfoCollected()) {
			return null;
		}
		return identity;
	}

	private void applyWechatIdentity(ProjectView project, AnswerRequest request, SurveyWechatIdentity identity) {
		if (!isWechatOnly(project) || !isWechatOfficialEnabled()) {
			return;
		}
		if (request.getAnswer() == null) {
			request.setAnswer(new LinkedHashMap<>());
		}
		request.getAnswer().remove("openid");
		request.getAnswer().remove("wechatNickname");
		request.getAnswer().remove("wechatAvatarUrl");
		if (identity != null && Boolean.TRUE.equals(project.getSetting().getAnswerSetting().getWechatUserInfo())) {
			request.getAnswer().put("openid", identity.getOpenId());
			request.getAnswer().put("wechatNickname", identity.getNickname());
			request.getAnswer().put("wechatAvatarUrl", identity.getAvatarUrl());
		}
	}

	private boolean isWechatOnly(ProjectView project) {
		return project != null && project.getSetting() != null && project.getSetting().getAnswerSetting() != null
				&& Boolean.TRUE.equals(project.getSetting().getAnswerSetting().getWechatOnly());
	}

	private boolean isWechatOfficialEnabled() {
		OAuthSetting setting = systemService.getSystemOAuthSetting();
		OAuthSetting.WechatClient client = setting == null ? null : setting.getWechatOfficial();
		return setting != null && StringUtils.isNotBlank(setting.getPublicBaseUrl()) && client != null
				&& Boolean.TRUE.equals(client.getEnabled()) && StringUtils.isNotBlank(client.getAppId())
				&& StringUtils.isNotBlank(client.getAppSecret());
	}

	private boolean isWechatRequest() {
		HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
		return request != null && StringUtils.containsIgnoreCase(
				StringUtils.defaultString(request.getHeader(HttpHeaders.USER_AGENT)), "micromessenger");
	}

	/**
	 * 提交阶段的校验：只做「还能不能交」相关的判断，不做登录/cookie/ip 限次
	 * （那些是"能不能开始答"的约束，修改已有答卷时不该再拦一次）。
	 *
	 * @param project 项目
	 * @param isNewAnswer true=新建答卷，才校验回收上限；false=修改已有答卷
	 */
	private void validateSubmittable(ProjectView project, boolean isNewAnswer) {
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		ProjectSetting setting = project.getSetting();
		if (setting == null || setting.getAnswerSetting() == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		if (setting.getStatus() != null && setting.getStatus() == 0) {
			throw new ErrorCodeException(ErrorCode.SurveySuspend);
		}
		Long endTime = setting.getAnswerSetting().getEndTime();
		if (endTime != null && System.currentTimeMillis() > endTime) {
			throw new ErrorCodeException(ErrorCode.ExceededEndTime);
		}
		if (isNewAnswer) {
			Long maxAnswers = setting.getAnswerSetting().getMaxAnswers();
			if (maxAnswers != null) {
				AnswerQuery answerQuery = new AnswerQuery();
				answerQuery.setProjectId(project.getId());
				if (answerService.count(answerQuery) >= maxAnswers) {
					throw new ErrorCodeException(ErrorCode.ExceededMaxAnswers);
				}
			}
		}
	}

	/**
	 * 根据问卷设置校验问卷
	 * @param project
	 * @return
	 */
	public void validateProject(ProjectView project) {
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}

		ProjectSetting setting = project.getSetting();
		String projectId = project.getId();
		if (setting.getStatus() == 0) {
			throw new ErrorCodeException(ErrorCode.SurveySuspend);
		}

		Long maxAnswers = setting.getAnswerSetting().getMaxAnswers();
		// 校验最大答案条数限制
		if (maxAnswers != null) {
			AnswerQuery answerQuery = new AnswerQuery();
			answerQuery.setProjectId(project.getId());
			long totalAnswers = answerService.count(answerQuery);
			if (totalAnswers >= maxAnswers) {
				throw new ErrorCodeException(ErrorCode.ExceededMaxAnswers);
			}
		}
		// 校验问卷是否已到结束时间
		Long endTime = setting.getAnswerSetting().getEndTime();
		if (endTime != null) {
			if (new Date().getTime() > endTime) {
				throw new ErrorCodeException(ErrorCode.ExceededEndTime);
			}
		}
		// 如果需要登录，则使用账号进行限制
		if (setting.getAnswerSetting().getLoginLimit() != null
				&& Boolean.TRUE.equals(setting.getAnswerSetting().getLoginRequired())) {
			validateLoginLimit(projectId, setting);
		}
		// cookie 限制
		if (setting.getAnswerSetting().getCookieLimit() != null) {
			validateCookieLimit(projectId, setting);
		}
		// ip 限制
		if (setting.getAnswerSetting().getIpLimit() != null) {
			validateIpLimit(projectId, setting);
		}
		// 白名单限制
		if (setting.getAnswerSetting().getWhitelistLimit() != null) {
			validateWhitelistLimit(projectId, setting);
		}
		validateExamSetting(project);
	}

	/**
	 * 答案校验
	 * @param project
	 * @param request
	 */
	private void validateAnswer(ProjectView project, AnswerRequest request) {
		List<SurveySchema> uniqueSchemaList = SchemaHelper.findSchemaListByAttribute(project.getSurvey(), "unique",
				true);
		SchemaHelper.TreeNode treeNode = SchemaHelper.SurveySchema2TreeNode(project.getSurvey());
		uniqueSchemaList.forEach(optionSchema -> {
			// 支持数值和字符串
			String questionId = treeNode.getTreeNodeMap().get(optionSchema.getId()).getParent().getData().getId();
			Object questionValue = request.getAnswer().get(questionId);
			if (questionValue == null) {
				return;
			}
			String uniqueQuery = String.format("\"%s\":", optionSchema.getId());
			if (SurveySchema.DataType.number == optionSchema.getAttribute().getDataType()) {
				uniqueQuery += ((Map) questionValue).get(optionSchema.getId());
			}
			else {
				uniqueQuery += "\"" + ((Map) questionValue).get(optionSchema.getId()) + "\"";
			}
			AnswerQuery query = new AnswerQuery();
			query.setProjectId(project.getId());
			query.setValueQuery(uniqueQuery);
			if (answerService.count(query) > 0) {
				String uniqueText = optionSchema.getAttribute().getUniqueText();
				throw new ValidationException(isNotBlank(uniqueText) ? uniqueText : i18n("survey.answer.duplicate"));
			}
		});

		// 选项配额校验
		List<SurveySchema> hasQuotaSchemaList = SchemaHelper.findSchemaHasAttribute(project.getSurvey(), "quota");
		if (hasQuotaSchemaList.size() > 0) {
			ProjectQuery query = new ProjectQuery();
			query.setId(request.getProjectId());
			PublicStatisticsView statisticsView = statProject(query);

			hasQuotaSchemaList.forEach(optionSchema -> {
				String questionId = treeNode.getTreeNodeMap().get(optionSchema.getId()).getParent().getData().getId();
				Object questionValue = request.getAnswer().get(questionId);
				if (questionValue == null) {
					return;
				}
				boolean optionNotChecked = ((Map) questionValue).get(optionSchema.getId()) == null;
				if (optionNotChecked) {
					return;
				}
				PublicStatisticsView.QuestionStatistics questionStatistics = statisticsView.getQuestionStatistics()
						.get(questionId);
				int optionSelectedCount = questionStatistics.getOptionStatistics().stream()
						.filter(x -> x.getOptionId().equals(optionSchema.getId())).findFirst()
						.orElse(new PublicStatisticsView.OptionStatistics()).getCount();
				Integer quota = optionSchema.getAttribute().getQuota();
				if (quota != null && optionSelectedCount + 1 > quota) {
					throw new ValidationException(i18n("survey.option.limitExceeded"));
				}
			});
		}

	}

	private void validateExamSetting(ProjectView project) {
		ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
		if (examSetting == null || !ProjectModeEnum.exam.equals(project.getMode())) {
			return;
		}
		// 校验考试开始时间
		if (examSetting.getStartTime() != null && new Date(examSetting.getStartTime()).compareTo(new Date()) > 0) {
			throw new ErrorCodeException(ErrorCode.ExamUnStarted);
		}
		// 校验考试结束时间
		if (examSetting.getEndTime() != null && new Date(examSetting.getEndTime()).compareTo(new Date()) < 0) {
			throw new ErrorCodeException(ErrorCode.ExamFinished);
		}
	}

	/**
	 * 校验问卷并且判断是否要更新最近一次的答案
	 * @param project
	 * @param request
	 * @return 最近一次的答案
	 */
	private AnswerView validateAndGetLatestAnswer(ProjectView project, AnswerRequest request) {
		ProjectSetting setting = project.getSetting();
		boolean needGetLatest = false;
		try {
			validateProject(project);
			validateAnswer(project, request);
			// 未设时间限制&需要登录&可以修改，永远修改的是同一份
			if (SecurityContextUtils.isAuthenticated() && setting != null
					&& Boolean.TRUE.equals(setting.getSubmittedSetting().getEnableUpdate())) {
				needGetLatest = true;
			}
		}
		catch (ErrorCodeException e) {
			// 如果设置了时间限制，只能修改某个时间区间内的问卷
			// 登录&问卷已提交&允许修改，则可以继续修改
			if (ErrorCode.SurveySubmitted.equals(e.getErrorCode()) && SecurityContextUtils.isAuthenticated()
					&& setting != null && Boolean.TRUE.equals(setting.getSubmittedSetting().getEnableUpdate())) {
				needGetLatest = true;
			}
			else {
				throw e;
			}
		}
		// 获取最近一份的问卷执行答案更新操作
		if (needGetLatest) {
			AnswerQuery answerQuery = new AnswerQuery();
			answerQuery.setProjectId(project.getId());
			answerQuery.setLatest(true);
			AnswerView latestAnswer = answerService.getAnswer(answerQuery);
			if (latestAnswer != null) {
				return latestAnswer;
			}
		}
		return null;
	}

	/**
	 * 获取最近一次的答案
	 * @param projectView
	 * @return
	 */
	private LinkedHashMap<String, Object> getLatestAnswer(PublicProjectView projectView, String whitelistName) {
		// 打开了答案允许修改开关
		ProjectSetting projectSetting = projectView.getSetting();
		if (projectSetting == null || projectSetting.getSubmittedSetting() == null
				|| !Boolean.TRUE.equals(projectSetting.getSubmittedSetting().getEnableUpdate())) {
			return null;
		}
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setProjectId(projectView.getId());
		answerQuery.setLatest(true);
		if (whitelistName != null) {
			ProjectPartner partner = projectPartnerMapper.selectOne(
					Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, projectView.getId())
							.eq(ProjectPartner::getUserName, whitelistName));
			if (partner != null && !SecurityContextUtils.isAuthenticated()) {
				answerQuery.setCreateBy(partner.getId());
			}
		}
		// 通过白名单或者答卷人来获取最近一次的答卷记录
		if (SecurityContextUtils.isAuthenticated() || answerQuery.getCreateBy() != null) {
			AnswerView latest = answerService.getAnswer(answerQuery);
			if (latest == null) {
				return null;
			}
			// 把这份答卷的 id / metaInfo 一并带给前端：刷新后恢复切屏计数，也能精确指向这份成绩
			projectView.setAnswerId(latest.getId());
			projectView.setMetaInfo(latest.getMetaInfo());
			return latest.getAnswer();
		}
		return null;
	}

	/**
	 * 公开查询修改答案，因为涉及到权限操作，需要将之前的答案和更新的答案做一个 merge 操作
	 * @param project
	 * @param answer
	 */
	private void validateAndMergeAnswer(ProjectView project, AnswerRequest answer) {
		if (isBlank(answer.getQueryId()) || isBlank(answer.getId())) {
			throw new ErrorCodeException(ErrorCode.QueryResultUpdateError);
		}
		try {
			// 公开查询设置必须存在，并且包含可编辑字段
			ProjectSetting.PublicQuery query = project.getSetting().getSubmittedSetting().getPublicQuery().stream()
					.filter(x -> x.getId().equals(answer.getQueryId())).findFirst().orElseGet(() -> {
						ProjectSetting.PublicQuery publicQuery = new ProjectSetting.PublicQuery();
						publicQuery.setFieldPermission(new LinkedHashMap<>());
						return publicQuery;
					});
			if (!query.getFieldPermission().values().contains(FieldPermissionType.editable)) {
				throw new ErrorCodeException(ErrorCode.QueryResultUpdateError);
			}
			AnswerView latestAnswer = getAnswerForProject(project.getId(), answer.getId());
			LinkedHashMap<String, Object> existAnswer = latestAnswer.getAnswer();
			existAnswer.forEach((key, value) -> {
				if (!answer.getAnswer().containsKey(key)) {
					answer.getAnswer().put(key, value);
				}
			});
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.QueryResultUpdateError);
		}
	}

	/**
	 * 提交阶段的「能不能作答」闸门。
	 *
	 * <p>此前密码 / 需要登录 / 白名单只在「打开问卷」时校验，直接 POST saveAnswer 就能绕过。
	 * 这里把同一套条件在提交路径上再判一次；回收上限不在此列（会挡住正常修改答案）。
	 */
	private void validateAnswerGate(ProjectView project, boolean newAnswer) {
		if (project == null || project.getSetting() == null || project.getSetting().getAnswerSetting() == null) {
			return;
		}
		ProjectSetting.AnswerSetting answerSetting = project.getSetting().getAnswerSetting();
		// 需要登录
		if (Boolean.TRUE.equals(answerSetting.getLoginRequired()) && !SecurityContextUtils.isAuthenticated()) {
			throw new AccessDeniedException("该问卷需要登录后才能作答");
		}
		// 需要密码：必须已通过密码校验（见 markPasswordPassed）
		if (answerSetting.getPassword() != null && !isPasswordPassed(project.getId(), answerSetting.getPassword())) {
			throw new AccessDeniedException("该问卷需要密码，请先在答题页输入正确密码");
		}
		// 白名单
		if (answerSetting.getWhitelistType() != null) {
			validateWhitelistLimit(project.getId(), project.getSetting());
		}
		// 开始时间（配置在考试设置里）
		ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
		Long startTime = examSetting == null ? null : examSetting.getStartTime();
		if (startTime != null && System.currentTimeMillis() < startTime) {
			throw new ErrorCodeException(ErrorCode.SurveySuspend);
		}
		// 每 IP / 每台设备限次：此前只在「打开问卷」时校验，直接 POST saveAnswer 可绕过；
		// 只在新建答卷时校验，否则调用方自己的那份答卷会把额度算进去、导致改答案被拦。
		if (Boolean.TRUE.equals(newAnswer)) {
			if (answerSetting.getCookieLimit() != null) {
				validateCookieLimit(project.getId(), project.getSetting());
			}
			if (answerSetting.getIpLimit() != null) {
				validateIpLimit(project.getId(), project.getSetting());
			}
		}
	}

	/** 记录「本机已通过某问卷的密码」：cookie 存哈希，不存明文，2 小时有效 */
	private void markPasswordPassed(String projectId, String password) {
		try {
			String value = sha256(projectId + "|" + password);
			Cookie cookie = new Cookie(AppConsts.COOKIE_PWD_PREFIX + projectId, value);
			cookie.setPath("/");
			cookie.setMaxAge(2 * 3600);
			cookie.setHttpOnly(true);
			ContextHelper.getCurrentHttpResponse().addCookie(cookie);
		}
		catch (Exception e) {
			log.warn("写入问卷密码通过标记失败: projectId={}", projectId, e);
		}
	}

	private boolean isPasswordPassed(String projectId, String password) {
		try {
			String expected = sha256(projectId + "|" + password);
			String actual = ContextHelper.getCookie(AppConsts.COOKIE_PWD_PREFIX + projectId);
			return expected.equals(actual);
		}
		catch (Exception e) {
			return false;
		}
	}

	private static String sha256(String text) {
		try {
			java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
			StringBuilder sb = new StringBuilder(hash.length * 2);
			for (byte b : hash) {
				sb.append(String.format("%02x", b));
			}
			return sb.toString();
		}
		catch (Exception e) {
			throw new IllegalStateException(e);
		}
	}

	private AnswerView getAnswerForProject(String projectId, String answerId) {
		return getAnswerForProject(projectId, answerId, false);
	}

	private AnswerView getAnswerForProject(String projectId, String answerId, boolean rankEnabled) {
		if (isBlank(projectId) || isBlank(answerId)) {
			throw new AccessDeniedException("无权限访问该答案");
		}
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setId(answerId);
		AnswerView answerView = answerService.getAnswer(answerQuery);
		if (answerView == null || !Objects.equals(projectId, answerView.getProjectId())) {
			throw new AccessDeniedException("无权限访问该答案");
		}
		// 归属校验：只校验「属于该项目」是不够的——answerId 会出现在成绩单 URL 里，
		// 拿到别人的 answerId 就能读/改别人的答卷（公开接口是 permitAll）。
		assertAnswerOwnership(answerView);
		if (rankEnabled) {
			answerQuery.setRankEnabled(true);
			return answerService.getAnswer(answerQuery);
		}
		return answerView;
	}

	/**
	 * 答卷归属校验。
	 *
	 * <p>合法持有者只有两种：
	 * <ol>
	 * <li>登录用户本人（答卷 createBy 等于当前用户；白名单导入的答卷 createBy 是 partner id，
	 * 靠 {@link #validateWhitelistLimit} 的同一套 createBy 语义判断）；</li>
	 * <li>匿名用户本机：浏览器里存着这份答卷的 id（答题时的随机卷 cookie
	 * {@code rd_answer_id_<projectId>}，或前端 localStorage 走后端暂存时下发的同名 cookie）。</li>
	 * </ol>
	 * 两者都不成立一律拒绝，避免「知道 UUID 就能看别人答案」。
	 */
	private void assertAnswerOwnership(AnswerView answerView) {
		String userId = SecurityContextUtils.getUserId();
		if (isNotBlank(userId) && Objects.equals(userId, answerView.getCreateBy())) {
			return;
		}
		String cookieAnswerId = ContextHelper
				.getCookie(AppConsts.COOKIE_RANDOM_PROJECT_PREFIX + answerView.getProjectId());
		if (isNotBlank(cookieAnswerId) && Objects.equals(cookieAnswerId, answerView.getId())) {
			return;
		}
		// 白名单场景：答卷 createBy 是 partner 记录 id，由访问白名单的 cookie 关联，这里不做额外放行，
		// 登录态用户也不会命中（userId != partner id），故统一走拒绝。
		throw new AccessDeniedException("无权访问该答卷");
	}

	private void validateLoginLimit(String projectId, ProjectSetting setting) {
		String userId = SecurityContextUtils.getUserId();
		if (userId == null) {
			log.info("user is empty");
			return;
		}
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setCreateBy(userId);
		doValidate(setting, query, setting.getAnswerSetting().getLoginLimit());
	}

	private void validateCookieLimit(String projectId, ProjectSetting setting) {
		HttpServletRequest request = ContextHelper.getCurrentHttpRequest();

		Cookie limitCookie = WebUtils.getCookie(request, AppConsts.COOKIE_LIMIT_NAME);
		if (limitCookie == null) {
			// 添加 cookie
			HttpServletResponse response = ContextHelper.getCurrentHttpResponse();

			final Cookie cookie = new Cookie(AppConsts.COOKIE_LIMIT_NAME, UUID.randomUUID().toString());
			cookie.setPath("/");
			cookie.setMaxAge(100 * 360 * 24 * 60 * 60);
			cookie.setHttpOnly(true);
			response.addCookie(cookie);
			response.addCookie(cookie);
			return;
		}
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setCookie(limitCookie.getValue());
		doValidate(setting, query, setting.getAnswerSetting().getCookieLimit());
	}

	private void validateIpLimit(String projectId, ProjectSetting setting) {
		HttpServletRequest request = ContextHelper.getCurrentHttpRequest();
		String ip = IPUtils.getClientIpAddress(request);
		if (ip == null) {
			log.info("ip is empty");
			return;
		}
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setIp(ip);
		doValidate(setting, query, setting.getAnswerSetting().getIpLimit());
	}

	private void validateWhitelistLimit(String projectId, ProjectSetting setting) {
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		// 如果白名单校验成功，导入用户获取partner表的id，系统用户是当前登录用户 id
		String createBy = (String) ContextHelper.getCurrentHttpRequest().getAttribute("createBy");
		if (createBy != null) {
			query.setCreateBy(createBy);
			doValidate(setting, query, setting.getAnswerSetting().getWhitelistLimit());
		}
	}

	private void doValidate(ProjectSetting setting, AnswerQuery query, ProjectSetting.UniqueLimitSetting limitSetting) {
		// 通过 cron 计算时间窗
		CronHelper helper = new CronHelper(limitSetting.getLimitFreq().getCron());
		Tuple2<LocalDateTime, LocalDateTime> currentWindow = helper.currentWindow();
		if (currentWindow != null) {
			query.setStartTime(Date.from(currentWindow.getFirst().atZone(ZoneId.systemDefault()).toInstant()));
			query.setEndTime(Date.from(currentWindow.getSecond().atZone(ZoneId.systemDefault()).toInstant()));
		}
		long total = answerService.count(query);
		// 允许修改答案的话就获取最近一次的答案，不抛出异常
		if (setting.getSubmittedSetting() != null
				&& Boolean.TRUE.equals(setting.getSubmittedSetting().getEnableUpdate())) {
			return;
		}
		if (limitSetting.getLimitNum() != null && total >= limitSetting.getLimitNum()) {
			throw new ErrorCodeException(ErrorCode.SurveySubmitted);
		}
	}

	private Tuple2<ProjectView, ProjectSetting.PublicQuery> getProjectAndQueryThenValidate(PublicQueryRequest request) {
		ProjectView project = projectService.getProject(request.getId());
		List<ProjectSetting.PublicQuery> queries = project.getSetting().getSubmittedSetting().getPublicQuery();
		if (queries == null || queries.size() == 0) {
			throw new ErrorCodeException(ErrorCode.QueryNotExist);
		}
		ProjectSetting.PublicQuery query = queries.stream().filter(x -> x.getId().equals(request.getResultId()))
				.findFirst().orElseThrow(() -> new ErrorCodeException(ErrorCode.QueryNotExist));
		validatePublicQuery(query, request.getAnswer());
		return new Tuple2<>(project, query);
	}

	/**
	 * @param query 公开查询配置
	 * @param answer 查询答案
	 */
	@SneakyThrows
	private void validatePublicQuery(ProjectSetting.PublicQuery query, LinkedHashMap answer) {
		if (Boolean.FALSE.equals(query.getEnabled())) {
			throw new ErrorCodeException(ErrorCode.QueryDisabled);
		}
		SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		List<String> linkValidityPeriod = query.getLinkValidityPeriod();
		if (linkValidityPeriod != null && linkValidityPeriod.size() == 2 && !DateUtils.isBetween(new Date(),
				sdf.parse(linkValidityPeriod.get(0)), sdf.parse(linkValidityPeriod.get(1)))) {
			throw new ErrorCodeException(ErrorCode.QueryDisabled);
		}
		// 校验密码
		if (isNotBlank(query.getPassword()) && answer != null) {
			if (!answer.containsKey(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID)) {
				throw new ErrorCodeException(ErrorCode.QueryPasswordError);
			}
			String password = (String) ((Map) answer.get(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID))
					.get(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID);
			if (isBlank(password) || !query.getPassword().equals(password.trim())) {
				throw new ErrorCodeException(ErrorCode.QueryPasswordError);
			}
			answer.remove(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID);
		}
	}

	/**
	 * 前端支持动态主题(问卷主题/表单主题)切换，动态构建查询表单
	 * @param project
	 * @param query
	 * @return
	 */
	private SurveySchema buildQueryFormSchema(ProjectView project, ProjectSetting.PublicQuery query) {
		SurveySchema schema = SurveySchema.builder().id(query.getId()).title(query.getTitle())
				.description(query.getDescription())
				.children(findMatchChildrenInSchema(query.getConditionQuestion(), project))
				.attribute(SurveySchema.Attribute.builder().submitButton(i18n("survey.query.submit")).build()).build();
		// 目前只支持文本题 #{huaw}#{fhpd}
		if (isNotBlank(query.getPassword())) {
			// 添加一个password的schema，用于密码校验
			SurveySchema passwordSchema = SurveySchema.builder().id(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID)
					.title(i18n("survey.password.title")).type(SurveySchema.QuestionType.FillBlank)
					.attribute(SurveySchema.Attribute.builder().required(true).build()).build();
			passwordSchema.setChildren(Collections
					.singletonList(SurveySchema.builder().id(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID).build()));
			schema.getChildren().add(passwordSchema);
		}
		return schema;
	}

	private List<SurveySchema> findMatchChildrenInSchema(String conditionQuestion, ProjectView project) {
		if (isBlank(conditionQuestion)) {
			return new ArrayList<>();
		}
		Pattern condPattern = Pattern.compile("#\\{(.*?)\\}");
		Matcher m = condPattern.matcher(conditionQuestion);
		List<String> conditionIds = new ArrayList<>();
		while (m.find()) {
			String qId = m.group(1);
			conditionIds.add(qId);
		}
		return SchemaHelper.flatSurveySchema(project.getSurvey()).stream()
				.filter(qSchema -> conditionIds.contains(qSchema.getId())).collect(Collectors.toList());
	}

	/**
	 * 根据配置的字段权限信息来过滤要查询的字段
	 * @param project
	 * @param query
	 * @return
	 */
	private SurveySchema buildQueryResultSchema(ProjectView project, ProjectSetting.PublicQuery query) {
		SurveySchema schema = project.getSurvey().deepCopy();
		SchemaHelper.updateSchemaByPermission(query.getFieldPermission(), schema);
		if (query.getFieldPermission().values().contains(FieldPermissionType.editable)) {
			schema.setAttribute(
					SurveySchema.Attribute.builder().submitButton(i18n("survey.edit.submit")).suffix(null).build());
		}
		else {
			schema.setAttribute(null);
		}
		if (ProjectModeEnum.exam.equals(project.getMode())) {
			schema.getChildren().add(SurveySchema.builder().id("examScore").title(i18n("survey.score.title"))
					.type(SurveySchema.QuestionType.FillBlank)
					.attribute(SurveySchema.Attribute.builder().readOnly(true).build())
					.children(Collections.singletonList(SurveySchema.builder().id("examScore").build())).build());
		}
		// 公开查询表单需要取消结束、显示隐藏、跳转规则
		SchemaHelper.ignoreAttributes(schema, "finishRule", "visibleRule", "jumpRule");
		return schema;
	}

	/**
	 * @param request 提交的请求
	 * @param projectAndQuery 项目信息和当前查询信息
	 * @return
	 */
	private List<Answer> findAnswerByQuery(PublicQueryRequest request,
			Tuple2<ProjectView, ProjectSetting.PublicQuery> projectAndQuery) {
		ProjectView projectView = projectAndQuery.getFirst();
		List<SurveySchema> conditionSchemaList = findMatchChildrenInSchema(
				projectAndQuery.getSecond().getConditionQuestion(), projectAndQuery.getFirst());
		if (conditionSchemaList.size() == 0 && request.getQuery().size() == 0) {
			throw new ErrorCodeException(ErrorCode.QueryResultNotExist);
		}
		SchemaHelper.TreeNode treeNode = SchemaHelper.SurveySchema2TreeNode(projectView.getSurvey());

		// 通过 url 参数构建查询表单
		LinkedHashMap<String, Map> queryFormValues = buildFormValuesFromQueryParameter(treeNode, request.getQuery());
		// 将查询表单和url参数构建的查询表单合并
		queryFormValues.putAll(request.getAnswer());

		List<Answer> answer = ((AnswerServiceImpl) answerService)
				.list(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, projectView.getId()).and(i -> {
					queryFormValues.forEach((qId, qValueObj) -> {
						i.like(Answer::getAnswer,
								buildLikeQueryConditionOfQuestion(treeNode.getTreeNodeMap().get(qId), qValueObj));
					});
				}));
		if (answer.size() == 0) {
			throw new ErrorCodeException(ErrorCode.QueryResultNotExist);
		}
		// 根据配置过滤结果
		return answer;
	}

	/**
	 * 通过查询参数里面构建 form values
	 * @param query
	 * @return
	 */
	private LinkedHashMap buildFormValuesFromQueryParameter(SchemaHelper.TreeNode surveySchemaTreeNode,
			Map<String, String> query) {
		LinkedHashMap<String, Map> formValues = new LinkedHashMap<>();
		query.forEach((id, value) -> {
			// 默认为选项
			SchemaHelper.TreeNode findNode = surveySchemaTreeNode.getTreeNodeMap().get(id);
			String questionId = findNode.getParent().getData().getId();
			Map questionValueMap = formValues.computeIfAbsent(questionId, k -> new HashMap<>());
			questionValueMap.put(id, value);
		});
		return formValues;
	}

	/**
	 * 通过问题答案手动构建like 查询
	 * @param qNode 当前问题的 schema node 节点
	 * @param qValueObj 当前问题的答案
	 * @return
	 */
	private String buildLikeQueryConditionOfQuestion(SchemaHelper.TreeNode qNode, Map qValueObj) {
		SurveySchema optionSchema = qNode.getData().getChildren().get(0);
		String optionId = optionSchema.getId();
		Object optionValue = qValueObj.get(optionId);
		String value = optionValue.toString();
		// 选项非数值类型
		if (optionSchema.getAttribute() == null
				|| !SurveySchema.DataType.number.equals(optionSchema.getAttribute().getDataType())) {
			value = "\"" + value + "\"";
		}
		return String.format("{\"%s\":%s}", optionId, value);
	}

	/**
	 * 根据字段权限配置过滤结果集，过滤掉隐藏题的答案
	 * @param answer
	 * @param fieldPermission
	 */
	private void filterAnswerByFieldPermission(LinkedHashMap answer, LinkedHashMap<String, Integer> fieldPermission) {
		fieldPermission.entrySet().forEach(entry -> {
			String qId = entry.getKey();
			Integer permission = entry.getValue();
			if (FieldPermissionType.hidden == permission) {
				answer.remove(qId);
			}
		});
	}

	/**
	 * 如果问卷需要登录、需要密码答卷、需要白名单答卷进入问卷之前需要弹出验证表单
	 * @param project 当前项目
	 * @param answer 查询表单的答案
	 * @return 返回查询表单的 schema，如果未空，则会直接进入到答卷页面
	 */
	private SurveySchema convertAndValidateLoginFormIfNeeded(ProjectView project,
			LinkedHashMap<String, Object> answer) {
		boolean loginRequired = false;
		// 需要更新答题者为已访问的状态
		boolean updatePartnerVisited = false;
		LambdaQueryWrapper<ProjectPartner> projectPartnerQuery = Wrappers.<ProjectPartner>lambdaQuery()
				.eq(ProjectPartner::getProjectId, project.getId());
		Authentication authentication = null;
		List<SurveySchema> queryConditions = new ArrayList<>();
		SurveySchema loginFormSchema = SurveySchema.builder().id(project.getId()).children(queryConditions)
				.title(project.getName()).build();
		// 错题练习模式需要登录
		if (project != null && project.getSetting() != null && project.getSetting().getExamSetting() != null) {
			ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
			if (Boolean.TRUE.equals(examSetting.getRandomSurveyWrong()) && !SecurityContextUtils.isAuthenticated()) {
				loginRequired = true;
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.username));
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.password));

				if (answer != null) {
					authentication = validateUsernameAndPassword(answer);
				}
			}
		}
		if (project != null && project.getSetting() != null && project.getSetting().getAnswerSetting() != null) {
			ProjectSetting.AnswerSetting answerSetting = project.getSetting().getAnswerSetting();
			// 需要登录答卷
			if (Boolean.TRUE.equals(answerSetting.getLoginRequired()) && !SecurityContextUtils.isAuthenticated()) {
				loginRequired = true;
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.username));
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.password));

				if (answer != null) {
					authentication = validateUsernameAndPassword(answer);
				}
			}
			// 需要密码答卷
			if (answerSetting.getPassword() != null) {
				loginRequired = true;
				queryConditions
						.add(SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.extraPassword));

				if (answer != null) {
					if (!answerSetting.getPassword().equals(
							SchemaHelper.getLoginFormAnswer(answer, SchemaHelper.LoginFormFieldEnum.extraPassword))) {
						throw new ErrorCodeException(ErrorCode.ValidationError);
					}
					// 密码校验通过：下发一个短期 cookie，作为「本次会话已通过密码」的凭据。
					// 否则直接 POST saveAnswer 就能绕开密码（提交路径不携带密码字段）。
					markPasswordPassed(project.getId(), answerSetting.getPassword());
				}
			}
			// 白名单为系统用户
			if (answerSetting.getWhitelistType() != null
					&& ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType() == answerSetting.getWhitelistType()) {
				// 如果当前已登录且当前用户不在白名单内，则报错
				if (SecurityContextUtils.isAuthenticated()) {
					boolean currentHasPerm = projectPartnerMapper.selectCount(
							Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, project.getId())
									.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType())
									.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId())) == 1;
					if (!currentHasPerm) {
						throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
					}
					updatePartnerVisited = true;
					projectPartnerQuery.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId())
							.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType());
				}
				else {
					// 需要执行登录操作
					SchemaHelper.appendChildIfNotExist(loginFormSchema,
							SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.username));
					SchemaHelper.appendChildIfNotExist(loginFormSchema,
							SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.password));
					loginRequired = true;

					if (answer != null) {
						if (authentication == null) {
							authentication = validateUsernameAndPassword(answer);
						}
						// 执行登录操作
						UserInfo user = (UserInfo) authentication.getPrincipal();
						// 判断登录用户是否在白名单里面
						/**
						 * todo 这里应该加上用户类型，否则会出查询出来多条 多条原因： 新创建的问卷的时候，默认的插入一条名单数据，type = 1
						 * 修改答题白名单设置为系统用户时，又插入一条，type = 3 修改答题白名单设置为外部用户时，又插入一条，type =
						 * 4，当然这条数据没有用户id，在这里不会被查出来
						 * 综上，这里至少会查询出2条，所以需要加入用户类型限制，或者修改答题白名单时移除旧数据
						 * 这里验证的是"白名单为系统用户"，所以type = 3
						 */
						boolean currentHasPerm = projectPartnerMapper.selectCount(
								Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, project.getId())
										.eq(ProjectPartner::getType,
												ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType())
										.eq(ProjectPartner::getUserId, user.getUserId())) == 1;
						if (!currentHasPerm) {
							throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
						}

						updatePartnerVisited = true;
						projectPartnerQuery.eq(ProjectPartner::getUserId, user.getUserId()).eq(ProjectPartner::getType,
								ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType());
					}
				}
			}
			// 白名单为导入用户
			if (answerSetting.getWhitelistType() != null
					&& ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == answerSetting.getWhitelistType()) {
				SchemaHelper.appendChildIfNotExist(loginFormSchema,
						SchemaHelper.buildFillBlankQuerySchema(SchemaHelper.LoginFormFieldEnum.whitelistName));
				loginRequired = true;

				if (answer != null) {
					// 校验登录白名单名称是否在白名单列表里面
					String whitelistName = (String) SchemaHelper.getLoginFormAnswer(answer,
							SchemaHelper.LoginFormFieldEnum.whitelistName);
					if (whitelistName == null) {
						throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
					}
					boolean currentHasPerm = projectPartnerMapper.selectCount(
							Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, project.getId())
									.eq(ProjectPartner::getUserName, whitelistName)) == 1;
					if (!currentHasPerm) {
						throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
					}

					updatePartnerVisited = true;
					projectPartnerQuery.eq(ProjectPartner::getUserName, whitelistName).eq(ProjectPartner::getType,
							ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType());
				}
			}

		}

		if (authentication != null) {
			// 执行登录操作，方便后续保存答案的时候获取认证信息
			UserInfo user = (UserInfo) authentication.getPrincipal();
			HttpCookie cookie = ResponseCookie
					.from(AppConsts.TOKEN_NAME, jwtTokenUtil.generateAccessToken(new UserTokenView(user.getUserId())))
					.path("/").httpOnly(true).build();
			ContextHelper.getCurrentHttpResponse().setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
		}

		// 更新问卷状态为已访问
		if (updatePartnerVisited) {
			ProjectPartner projectPartner = projectPartnerMapper.selectOne(projectPartnerQuery);
			if (projectPartner != null && projectPartner.getStatus() == AppConsts.ProjectPartnerStatus.UNVISITED) {
				projectPartner.setStatus(AppConsts.ProjectPartnerStatus.VISITED);
				projectPartnerMapper.updateById(projectPartner);
			}
			// 如果配置的外部用户，则 createBy 为 partner 的 id，如果是内部用户则是用户 id
			if (projectPartner.getUserName() != null) {
				ContextHelper.getCurrentHttpRequest().setAttribute("createBy", projectPartner.getId());
			}
			else if (projectPartner.getUserId() != null) {
				ContextHelper.getCurrentHttpRequest().setAttribute("createBy", SecurityContextUtils.getUserId());
			}
		}

		if (loginRequired) {
			return loginFormSchema;
		}

		return null;
	}

	/**
	 * 答卷前登录校验用户名和密码
	 * @param answer
	 * @return
	 */
	private Authentication validateUsernameAndPassword(LinkedHashMap<String, Object> answer) {
		try {
			Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
					SchemaHelper.getLoginFormAnswer(answer, SchemaHelper.LoginFormFieldEnum.username),
					SchemaHelper.getLoginFormAnswer(answer, SchemaHelper.LoginFormFieldEnum.password)));
			SecurityContextHolder.getContext().setAuthentication(authentication);
			return authentication;
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.ValidationError);
		}
	}

	/**
	 * 如果存在白名单，答卷完更新白名单为已访问的状态，由于导入用户白名单没有系统用户id，需要将答案的创建人更新为答题参与表的id。
	 * @param request
	 * @param project
	 */
	private void updateProjectPartnerByAnswer(AnswerRequest request, ProjectView project) {
		if (project.getSetting() != null && project.getSetting().getAnswerSetting() != null) {
			Integer whitelistType = project.getSetting().getAnswerSetting().getWhitelistType();
			if (whitelistType == null) {
				return;
			}

			LambdaQueryWrapper<ProjectPartner> queryWrapper = Wrappers.<ProjectPartner>lambdaQuery()
					.eq(ProjectPartner::getProjectId, project.getId());
			if (ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType() == whitelistType) {
				queryWrapper.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId()).eq(ProjectPartner::getType,
						ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType());
				if (!SecurityContextUtils.isAuthenticated()) {
					return;
				}
			}
			else if (ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == whitelistType) {
				queryWrapper.eq(ProjectPartner::getUserName, request.getWhitelistName()).eq(ProjectPartner::getType,
						ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType());
			}

			ProjectPartner projectPartner = projectPartnerMapper.selectOne(queryWrapper);
			projectPartner.setStatus(AppConsts.ProjectPartnerStatus.ANSWERED);
			projectPartnerMapper.updateById(projectPartner);

			// 白名单导入用户答题需要更新答案表的 createBy 为 partner 的 id
			if (ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == whitelistType) {
				AnswerRequest answerUpdateRequest = new AnswerRequest();
				answerUpdateRequest.setId(request.getId());
				answerUpdateRequest.setCreateBy(projectPartner.getId());
				answerUpdateRequest.setProjectId(request.getProjectId());
				answerService.updateAnswer(answerUpdateRequest);
			}

		}
	}

	private String i18n(String key, Object... args) {
		return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
	}

}
