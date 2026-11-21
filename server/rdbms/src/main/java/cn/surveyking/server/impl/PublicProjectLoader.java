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
import cn.surveyking.server.service.ClassResourceService;
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









@Component
@Transactional
@RequiredArgsConstructor
public class PublicProjectLoader {

	private final ProjectService projectService;


	private final cn.surveyking.server.service.ProjectPartnerService projectPartnerService;

	private final ProjectViewMapper projectViewMapper;


	private final AnswerServiceImpl answerService;

	private final RepoServiceImpl repoService;

	private final RepoPartnerService repoPartnerService;

	private final TemplateServiceImpl templateService;

	private final UserBookServiceImpl userBookService;

	private final RandomSurveyProcessor randomSurveyProcessor;

	private final WechatAccessGuard wechatAccessGuard;

	private final LoginFormValidator loginFormValidator;

	private final ProjectAnswerValidator projectAnswerValidator;

	private final ClassResourceService classResourceService;

	private final AnswerLookup answerLookup;


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
		if (StringUtils.isNotBlank(query.getClassToken())) {

			projectView.setClassId(classResourceService.resolveShareToken(project.getId(), query.getClassToken()));
		}
		if (wechatAccessGuard.wechatAccessRequired(project)) {
			projectView.setSurvey(null);
			projectView.setWechatAuthorizationRequired(
					wechatAccessGuard.isWechatOfficialEnabled() && wechatAccessGuard.isWechatRequest());
			projectView.setIsAuthenticated(SecurityContextUtils.isAuthenticated());
			return projectView;
		}
		SurveySchema loginFormSchema = null;

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

				projectView.setExamInfo(answer.getExamInfo());
				if (answer.getSurvey() != null) {
					projectView.setSurvey(answer.getSurvey());
				}
			}
			else {


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

			loginFormSchema = loginFormValidator.convertAndValidateLoginFormIfNeeded(project, null);

			if (!isPreviewAllowed(query, project.getId())) {
				projectAnswerValidator.validateProject(project);
			}
		}
		else {

			AnswerView answerView = answerLookup.getAnswerForProject(project.getId(), query.getAnswerId());
			if (answerView != null) {
				projectView.setAnswerId(answerView.getId());
				projectView.setMetaInfo(answerView.getMetaInfo());
				projectView.setAnswer(answerView.getAnswer());
				if (answerView.getSurvey() != null) {

					projectView.setSurvey(answerView.getSurvey());
				}
			}
			return projectView;
		}


		if (loginFormSchema != null) {
			projectView.setSurvey(loginFormSchema);
			projectView.setLoginRequired(true);
		}
		else {

			randomSurveyProcessor.processRandomSurvey(project, projectView);


			projectView.setAnswer(getLatestAnswer(projectView, null));
		}
		projectView.setIsAuthenticated(SecurityContextUtils.isAuthenticated());
		return projectView;
	}

	/**
	 * 预览模式放行判定：是否跳过「能不能答」的校验。
	 *
	 * <p>设计器里的「预览答题页」直接打开 {@code /s/{id}?preview=1}，如果照常走
	 * {@link ProjectAnswerValidator#validateProject}，未发布（status=0）、未到考试时间、
	 * 班级没分配都会被挡住——老师在编辑阶段根本打不开自己的卷子。
	 *
	 * <p>这里只放宽「能不能答」，不放宽「能不能看」：必须是管理员 / 项目所有者 / 协作者
	 * （含用户组授权）。提交路径不经过这里，预览里交不了卷。
	 */
	private boolean isPreviewAllowed(ProjectQuery query, String projectId) {
		if (query == null || !Boolean.TRUE.equals(query.getPreview())) {
			return false;
		}
		if (!SecurityContextUtils.isAuthenticated()) {
			return false;
		}
		if (SecurityContextUtils.isAdmin()) {
			return true;
		}
		return projectPartnerService.getProjectPerms().contains(projectId);
	}

	/** 首屏只返回必要的大纲元数据，不返回任何题干、选项或题目属性。 */
	public PublicProjectView loadProjectOutline(ProjectQuery query) {
		return toOutlineView(loadProject(query));
	}

	public PublicProjectView validateProjectOutline(ProjectQuery query) {
		return toOutlineView(validateProject(query));
	}

	private PublicProjectView toOutlineView(PublicProjectView view) {

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


		boolean exerciseMode = view.getSetting() != null && view.getSetting().getExamSetting() != null
				&& Boolean.TRUE.equals(view.getSetting().getExamSetting().getExerciseMode());
		if (exerciseMode) {
			SchemaHelper.ignoreAttributes(question, "examScore", "examMatchRule");
		}
		else {
			SchemaHelper.ignoreAttributes(question, "examCorrectAnswer", "examScore", "examMatchRule", "examAnalysis");
		}

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

		loginFormValidator.convertAndValidateLoginFormIfNeeded(project, query.getAnswer());
		PublicProjectView projectView = projectViewMapper.toPublicProjectView(project);

		randomSurveyProcessor.processRandomSurvey(project, projectView);

		if (!isPreviewAllowed(query, projectId)) {
			projectAnswerValidator.validateProject(project);
		}
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

		if (SecurityContextUtils.isAuthenticated() || answerQuery.getCreateBy() != null) {
			AnswerView latest = answerService.getAnswer(answerQuery);
			if (latest == null) {
				return null;
			}

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
