package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ExamExerciseTypeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicProjectView;
import cn.surveyking.server.domain.dto.PublicQuestionOutline;
import cn.surveyking.server.domain.dto.PublicQuestionRequest;
import cn.surveyking.server.domain.dto.RepoView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.mapper.ProjectViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.domain.model.Template;
import cn.surveyking.server.domain.model.UserBook;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.RepoPartnerService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 公开答卷页的读取：首屏 schema、题目大纲、单题下发、以及「打开问卷」时的访问校验。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 拆出的第六块，也是最大的一块。它只负责「读」，写入都委托给
 * {@link PublicAnswerSubmitter}；登录表单校验、问卷级校验、答卷归属分别交给
 * {@link LoginFormValidator}、{@link ProjectAnswerValidator}、{@link AnswerLookup}。
 */
@Component
@Transactional
@RequiredArgsConstructor
public class PublicProjectLoader {

	private final ProjectService projectService;

	private final ProjectViewMapper projectViewMapper;

	/** 题库练习要直接读写答卷（getOne / save），只能用实现类 */
	private final AnswerServiceImpl answerService;

	private final RepoServiceImpl repoService;

	private final RepoPartnerService repoPartnerService;

	private final TemplateServiceImpl templateService;

	private final UserBookServiceImpl userBookService;

	private final RandomSurveyProcessor randomSurveyProcessor;

	private final WechatAccessGuard wechatAccessGuard;

	private final LoginFormValidator loginFormValidator;

	private final ProjectAnswerValidator projectAnswerValidator;

	private final AnswerLookup answerLookup;

	/** 白名单参与人：按白名单名取最近一份答卷时要用 */
	private final ProjectPartnerMapper projectPartnerMapper;

	private final MessageSource messageSource;

	/**
	 * answerService 如果需要验证密码，则只有密码输入正确之后才开始加载 schema
	 * @param query
	 * @return
	 */
	public PublicProjectView loadProject(ProjectQuery query) {
		ProjectView project = projectService.getProject(query.getId());
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		PublicProjectView projectView = projectViewMapper.toPublicProjectView(project);
		if (wechatAccessGuard.wechatAccessRequired(project)) {
			projectView.setSurvey(null);
			projectView.setWechatAuthorizationRequired(
					wechatAccessGuard.isWechatOfficialEnabled() && wechatAccessGuard.isWechatRequest());
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
			loginFormSchema = loginFormValidator.convertAndValidateLoginFormIfNeeded(project, null);
			// 校验问卷
			projectAnswerValidator.validateProject(project);
		}
		else {
			// 直接根据答案加载出 schema
			AnswerView answerView = answerLookup.getAnswerForProject(project.getId(), query.getAnswerId());
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
	public PublicProjectView loadProjectOutline(ProjectQuery query) {
		return toOutlineView(loadProject(query));
	}

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
	public PublicProjectView validateProject(ProjectQuery query) {
		String projectId = query.getId();
		ProjectView project = projectService.getProject(projectId);
		wechatAccessGuard.requireWechatAccess(project);
		// 登录验证
		loginFormValidator.convertAndValidateLoginFormIfNeeded(project, query.getAnswer());
		PublicProjectView projectView = projectViewMapper.toPublicProjectView(project);
		// 随机问题
		randomSurveyProcessor.processRandomSurvey(project, projectView);
		// 校验问卷
		projectAnswerValidator.validateProject(project);
		projectView.setAnswer(getLatestAnswer(projectView, (String) SchemaHelper.getLoginFormAnswer(query.getAnswer(),
				SchemaHelper.LoginFormFieldEnum.whitelistName)));
		return projectView;
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

	private String i18n(String key, Object... args) {
		return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
	}

}
