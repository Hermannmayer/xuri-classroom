package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.ClassUtils;
import cn.surveyking.server.core.uitls.NanoIdUtils;
import cn.surveyking.server.core.uitls.RichTextSanitizer;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.ProjectViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.FileRefService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.validation.ValidationException;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.baomidou.mybatisplus.core.toolkit.StringUtils.isNotBlank;
import static org.apache.commons.lang3.StringUtils.isBlank;





@Service
@Transactional
@RequiredArgsConstructor
public class ProjectServiceImpl extends BaseService<ProjectMapper, Project> implements ProjectService {


	private static final String UNCATEGORIZED_NAME = "未分类";

	private final AnswerMapper answerMapper;

	private final ProjectViewMapper projectViewMapper;

	private final ProjectPartnerService projectPartnerService;

	private final FileRefService fileRefService;

	private final ObjectMapper objectMapper;

	@Autowired
	@Lazy
	private FileService fileService;

	private SpelExpressionParser spelParser = new SpelExpressionParser();

	private List<String> projectSettingUpdateKeys;

	@Override
	public PaginationResponse<ProjectView> listProject(ProjectQuery query) {

		String category = isBlank(query.getCategory()) ? null : query.getCategory().trim();
		boolean uncategorized = ProjectQuery.UNCATEGORIZED.equals(category);


		boolean categoryActive = category != null;

		boolean flat = Boolean.TRUE.equals(query.getFlat());
		boolean rootLevel = isBlank(query.getParentId()) && !categoryActive && !flat;



		List<String> grantedProjectIds = SecurityContextUtils.isAdmin() ? java.util.Collections.emptyList()
				: projectPartnerService.getProjectPerms();
		Page<Project> page = pageByQuery(query, Wrappers.<Project>lambdaQuery()
				.like(isNotBlank(query.getName()), Project::getName, query.getName())
				.eq(isNotBlank(query.getParentId()), Project::getParentId, query.getParentId())

				.and(rootLevel,
						c -> c.isNull(Project::getParentId).or().eq(Project::getParentId, "0"))
				.eq(query.getMode() != null, Project::getMode, query.getMode())





				.and(w -> w
						.exists("SELECT 1 FROM t_project_partner t WHERE t.project_id = t_project.id"
								+ " AND (t.user_id = {0} OR (t.group_id IS NOT NULL AND t.group_id IN ("
								+ UserDeptScopeService.DEPT_SCOPE_SQL + ")))"
								+ " AND t.type IN (1, 2, 3)",
								SecurityContextUtils.getUserId())


						.or()
						.exists("SELECT 1 FROM t_class_resource cr WHERE cr.resource_id = t_project.id"
								+ " AND cr.resource_type = 'project' AND cr.is_deleted = 0"
								+ " AND cr.class_id IN (" + UserDeptScopeService.DEPT_SCOPE_SQL + ")",
								SecurityContextUtils.getUserId())

						.or(!grantedProjectIds.isEmpty())
						.in(!grantedProjectIds.isEmpty(), Project::getId, grantedProjectIds))

				.and(uncategorized, c -> c.isNull(Project::getCategory).or().eq(Project::getCategory, ""))
				.eq(category != null && !uncategorized, Project::getCategory, category)

				.ne(categoryActive, Project::getMode, ProjectModeEnum.folder)

				.last("ORDER BY CASE WHEN mode = 'folder' THEN 0 ELSE 1 END ASC, create_at DESC"));
		PaginationResponse<ProjectView> result = new PaginationResponse<>(page.getTotal(),
				projectViewMapper.toView(page.getRecords()));
		fillPendingCount(result.getList());
		result.getList().forEach(view -> {
			if (ProjectModeEnum.folder.equals(view.getMode())) {
				view.setTotal(count(Wrappers.<Project>lambdaQuery().eq(Project::getParentId, view.getId())));
			}
			else {
				view.setTotal(answerMapper.selectCount(Wrappers.<Answer>lambdaQuery().eq(Answer::getTempSave, 1)
						.eq(Answer::getProjectId, view.getId())));
			}
		});
		return result;
	}

	/** 批量回填「待批改答卷数」 */
	private void fillPendingCount(java.util.List<ProjectView> views) {
		if (views == null || views.isEmpty()) {
			return;
		}
		views.forEach(view -> view.setPendingCount(0));
		java.util.List<String> projectIds = views.stream()
				.filter(view -> view.getId() != null && !ProjectModeEnum.folder.equals(view.getMode()))
				.map(ProjectView::getId).collect(java.util.stream.Collectors.toList());
		if (projectIds.isEmpty()) {
			return;
		}
		java.util.List<java.util.Map<String, Object>> rows = answerMapper.selectMaps(Wrappers.<Answer>query()
				.select("project_id AS pid", "COUNT(*) AS cnt").eq("temp_save", 1)
				.eq("grade_status", "pending").in("project_id", projectIds).groupBy("project_id"));
		java.util.Map<String, Integer> counts = new java.util.HashMap<>();
		for (java.util.Map<String, Object> row : rows) {
			Object pid = row.get("pid");
			Object cnt = row.get("cnt");
			if (pid != null && cnt instanceof Number number) {
				counts.put(String.valueOf(pid), number.intValue());
			}
		}
		for (ProjectView view : views) {
			if (view.getId() != null && !ProjectModeEnum.folder.equals(view.getMode())) {
				view.setPendingCount(counts.getOrDefault(view.getId(), 0));
			}
		}
	}

	/** 考试/问卷分类树：可见性与 #listProject(ProjectQuery) 同一口径，一次查出、内存组树 */
	@Override
	public List<ProjectTreeNode> tree() {
		String userId = SecurityContextUtils.getUserId();
		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Project> wrapper = Wrappers
				.<Project>lambdaQuery().select(Project::getId, Project::getName, Project::getParentId, Project::getMode,
						Project::getCreateAt);

			if (!SecurityContextUtils.isAdmin()) {

				List<String> grantedProjectIds = projectPartnerService.getProjectPerms();
				wrapper.and(w -> w.eq(Project::getCreateBy, userId)
						.or(!grantedProjectIds.isEmpty())
						.in(!grantedProjectIds.isEmpty(), Project::getId, grantedProjectIds));
			}
		List<Project> projects = list(wrapper);
		if (projects.isEmpty()) {
			return new ArrayList<>();
		}

		projects.sort(Comparator
				.comparingInt((Project project) -> ProjectModeEnum.folder.equals(project.getMode()) ? 0 : 1)
				.thenComparing(Project::getCreateAt, Comparator.nullsLast(Comparator.<Date>reverseOrder()))
				.thenComparing(Project::getName, Comparator.nullsLast(Comparator.<String>naturalOrder())));
		Map<String, Project> byId = new HashMap<>();
		Map<String, ProjectTreeNode> nodes = new LinkedHashMap<>();
		for (Project project : projects) {
			byId.put(project.getId(), project);
			ProjectTreeNode node = new ProjectTreeNode();
			node.setId(project.getId());
			node.setName(project.getName());
			node.setParentId(project.getParentId());
			node.setMode(project.getMode());
			nodes.put(project.getId(), node);
		}
		List<ProjectTreeNode> roots = new ArrayList<>();
		for (Project project : projects) {
			ProjectTreeNode node = nodes.get(project.getId());
			String parentId = project.getParentId();
			Project parent = isNotBlank(parentId) && !"0".equals(parentId) ? byId.get(parentId) : null;

			if (parent == null || Objects.equals(parent.getId(), project.getId())) {
				roots.add(node);
				continue;
			}
			nodes.get(parent.getId()).getChildren().add(node);
		}

		roots.forEach(this::fillTreeNodeCount);
		return roots;
	}

	@Override
	public List<ProjectCategoryView> listCategories() {
		String userId = SecurityContextUtils.getUserId();
		com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Project> wrapper = Wrappers
				.<Project>lambdaQuery().select(Project::getId, Project::getCategory)

				.ne(Project::getMode, ProjectModeEnum.folder);

		if (!SecurityContextUtils.isAdmin()) {

			wrapper.and(w -> w.eq(Project::getCreateBy, userId).or()
					.exists("SELECT 1 FROM t_project_partner t WHERE t.project_id = t_project.id"
							+ " AND (t.user_id = {0} OR (t.group_id IS NOT NULL AND t.group_id IN ("
							+ UserDeptScopeService.DEPT_SCOPE_SQL + ")))"
							+ " AND t.type IN (1, 2)",
							userId)

					.or()
					.exists("SELECT 1 FROM t_project child JOIN t_project_partner pt"
							+ " ON pt.project_id = child.parent_id OR pt.project_id = (SELECT p2.parent_id FROM t_project p2 WHERE p2.id = child.parent_id) WHERE child.id = t_project.id"
							+ " AND (pt.user_id = {0} OR (pt.group_id IS NOT NULL AND pt.group_id IN ("
							+ UserDeptScopeService.DEPT_SCOPE_SQL + ")))"
							+ " AND pt.type IN (1, 2, 3)",
							userId));
		}
		List<Project> projects = list(wrapper);
		Map<String, Integer> counts = new LinkedHashMap<>();
		for (Project project : projects) {
			if (project == null) {
				continue;
			}

			String name = isBlank(project.getCategory()) ? UNCATEGORIZED_NAME : project.getCategory().trim();
			counts.merge(name, 1, Integer::sum);
		}
		List<ProjectCategoryView> result = new ArrayList<>();
		counts.forEach((name, count) -> {
			ProjectCategoryView view = new ProjectCategoryView();
			view.setName(name);
			view.setCount(count);
			result.add(view);
		});
		result.sort(Comparator.comparing(ProjectCategoryView::getCount).reversed()
				.thenComparing(ProjectCategoryView::getName, Comparator.nullsLast(String::compareTo)));
		return result;
	}

	/** 分类名：trim，空白转 null（长度由前端限制 64，后端只做规范化） */
	private String normalizeCategory(String category) {
		if (category == null) {
			return null;
		}
		String trimmed = category.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	/** 递归回填 count，返回该子树里的非 folder 项目数 */
	private int fillTreeNodeCount(ProjectTreeNode node) {
		int total = ProjectModeEnum.folder.equals(node.getMode()) ? 0 : 1;
		if (node.getChildren() != null) {
			for (ProjectTreeNode child : node.getChildren()) {
				total += fillTreeNodeCount(child);
			}
		}
		node.setCount(total);
		return total;
	}

	public ProjectView getProject(String id) {
		if (ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(id)) {
			return ExerciseProjectTemplate.getExerciseTemplate();
		}
		return projectViewMapper.toView(getById(id));
	}

	@Override
	public ProjectView addProject(ProjectRequest request) {
		RichTextSanitizer.sanitizeSchema(request.getSurvey());
		Project project = projectViewMapper.fromRequest(request);

		project.setCategory(normalizeCategory(project.getCategory()));




		project.setSetting(completeSetting(project.getSetting()));


		if (request.getStatus() == null && project.getSetting().getStatus() != null) {
			project.setStatus(project.getSetting().getStatus());
		}
		String projectId = generateProjectId();
		project.setId(projectId);
		if (project.getSurvey() != null) {
			project.getSurvey().setId(projectId);
		}
		if (ProjectModeEnum.folder.equals(request.getMode())) {
			project.setPriority(
					count(Wrappers.<Project>lambdaQuery().eq(Project::getMode, ProjectModeEnum.folder)) + 1);
		}
		else {
			project.setPriority(
					count(Wrappers.<Project>lambdaQuery().ne(Project::getMode, ProjectModeEnum.folder)) + 1000);
		}
		save(project);
		syncOwnerRefs(project.getId(), project.getSurvey());

		ProjectPartnerRequest partnerRequest = new ProjectPartnerRequest();
		partnerRequest.setType(ProjectPartnerTypeEnum.OWNER.getType());
		partnerRequest.setProjectId(project.getId());
		partnerRequest.setUserIds(Collections.singletonList(SecurityContextUtils.getUserId()));
		projectPartnerService.addProjectPartner(partnerRequest);
		return projectViewMapper.toView(project);
	}

	/** 把 ProjectSetting 补齐成完整结构：缺整份就给默认值，缺某一层子结构就补该层 */
	private ProjectSetting completeSetting(ProjectSetting setting) {
		ProjectSetting target = setting == null ? new ProjectSetting() : setting;
		if (target.getStatus() == null) {
			target.setStatus(0);
		}
		if (target.getAnswerSetting() == null) {
			target.setAnswerSetting(new ProjectSetting.AnswerSetting());
		}
		if (target.getAnswerSetting().getProgressBar() == null) {
			target.getAnswerSetting().setProgressBar(true);
		}
		if (target.getAnswerSetting().getAutoSave() == null) {
			target.getAnswerSetting().setAutoSave(true);
		}
		if (target.getSubmittedSetting() == null) {
			target.setSubmittedSetting(new ProjectSetting.SubmittedSetting());
		}
		if (target.getExamSetting() == null) {
			target.setExamSetting(new ProjectSetting.ExamSetting());
		}
		return target;
	}

	private String generateProjectId() {
		String projectId = NanoIdUtils.randomNanoId(6);

		if (Character.isDigit(projectId.charAt(0))) {
			return generateProjectId();
		}
		if (getById(projectId) != null) {
			return generateProjectId();
		}
		return projectId;
	}

	/** 单独更新发布状态（开启/关闭收集） */
	@Override
	public void updateProjectStatus(ProjectStatusRequest request) {
		assertCanEditProject(request == null ? null : request.getId());
		if (request == null || isBlank(request.getId())) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}

		Integer status = request.getStatus() != null && request.getStatus() == 1 ? 1 : 0;
		synchronized (request.getId().intern()) {
			Project project = new Project();
			project.setId(request.getId());
			project.setStatus(status);
			Project existing = getById(request.getId());
			if (existing == null) {
				throw new ErrorCodeException(ErrorCode.ProjectNotFound);
			}
			ProjectSetting setting = completeSetting(existing.getSetting());
			setting.setStatus(status);


			project.setSetting(setting);
			updateById(project);
		}
	}

	@Override
	@SneakyThrows
	public void updateProject(ProjectRequest request) {
		assertCanEditProject(request == null ? null : request.getId());
		RichTextSanitizer.sanitizeSchema(request.getSurvey());



		boolean clearCategory = request.getCategory() != null && isBlank(request.getCategory());
		request.setCategory(normalizeCategory(request.getCategory()));
		synchronized (request.getId().intern()) {
			Project project = projectViewMapper.fromRequest(request);
			if (request.getSettingKey() != null) {
				validateSettingKey(request.getSettingKey());

				Project existing = getById(request.getId());


				ProjectSetting setting = completeSetting(existing == null ? null : existing.getSetting());
				spelParser.parseExpression(request.getSettingKey()).setValue(setting, request.getSettingValue());
				project.setSetting(setting);

				if ("status".equals(request.getSettingKey())) {
					project.setStatus((Integer) request.getSettingValue());
				}
			}
			else if (project.getSetting() != null && project.getSetting().getStatus() != null) {
				project.setStatus(project.getSetting().getStatus());
			}
			updateById(project);
			if (request.getSurvey() != null) {
				syncOwnerRefs(request.getId(), request.getSurvey());
			}
			if (clearCategory) {
				getBaseMapper().update(null, Wrappers.<Project>lambdaUpdate().eq(Project::getId, request.getId())
						.set(Project::getCategory, null));
			}
		}
	}

	/** spel漏洞修复，只允许更新指定参数 */
	private void validateSettingKey(String expressionString) {
		if (projectSettingUpdateKeys == null) {
			projectSettingUpdateKeys = ClassUtils.flatClassFields(ProjectSetting.class, new ArrayList<>(), 2);
		}
		if (!projectSettingUpdateKeys.contains(expressionString)) {
			throw new ValidationException("非法的更新参数");
		}
	}

	@Override
	public void deleteProject(ProjectRequest request) {
		assertCanEditProject(request == null ? null : request.getId());
		fileService.deleteByOwner("project", request.getId());
		removeById(request.getId());
	}

	private void syncOwnerRefs(String projectId, SurveySchema survey) {
		if (projectId == null || survey == null) {
			return;
		}
		try {
			fileService.replaceOwnerRefs("project", projectId, objectMapper.writeValueAsString(survey));
		}
		catch (Exception ignored) {

		}
	}

	/** 项目写操作闸门：管理员/所有者或 access_level>=2 的协作者（含用户组授权） */
	private void assertCanEditProject(String projectId) {

		int level = projectPartnerService.accessLevel(projectId);
		if (level < 2) {
			throw new org.springframework.security.access.AccessDeniedException("没有编辑该项目的权限");
		}
	}

	@Override
	public ProjectSetting getSetting(ProjectQuery query) {

		Project project = getById(query.getId());
		if (project == null || project.getSetting() == null) {
			return new ProjectSetting();
		}
		ProjectSetting setting = project.getSetting();
		if (setting == null) {
			return new ProjectSetting();
		}

		if (setting.getAnswerSetting() != null) {
			setting.getAnswerSetting().setPassword(null);
		}
		return setting;
	}

	@Override
	public List<ProjectView> getDeleted(ProjectQuery query) {
		List<ProjectView> list = projectViewMapper
				.toView(getBaseMapper().selectLogicDeleted(SecurityContextUtils.getUserId()));
		list.forEach(view -> {
			if (!ProjectModeEnum.folder.equals(view.getMode())) {
				view.setTotal(answerMapper.selectCount(Wrappers.<Answer>lambdaQuery()
						.eq(Answer::getProjectId, view.getId())));
			}
		});
		return list;
	}

	@Override
	public void batchDestroyProject(ProjectRequest request) {
		List<String> ids = assertProjectIdsPermitted(request.getIds());
		getBaseMapper().batchDestroy(ids);

		projectPartnerService.deleteAllProjectPartners(ids);




		Runnable purge = () -> {
			for (String id : ids) {
				fileService.purgeProjectFiles(id);
			}
		};
		if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
			org.springframework.transaction.support.TransactionSynchronizationManager
					.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
						@Override
						public void afterCommit() {
							purge.run();
						}
					});
		}
		else {
			purge.run();
		}
	}

	@Override
	public void restoreProject(ProjectRequest request) {
		getBaseMapper().restoreProject(assertProjectIdsPermitted(request.getIds()));
	}

	private List<String> assertProjectIdsPermitted(List<String> ids) {
		if (ids == null || ids.isEmpty()) {
			throw new ValidationException("未找到对应的问卷");
		}
		List<String> normalizedIds = ids.stream().filter(Objects::nonNull).distinct().collect(Collectors.toList());
		if (normalizedIds.isEmpty()) {
			throw new ValidationException("未找到对应的问卷");
		}
		List<String> projectPerms = projectPartnerService.getProjectPerms();
		if (!projectPerms.containsAll(normalizedIds)) {
			throw new ValidationException("没有权限访问本问卷");
		}
		return normalizedIds;
	}

	private <T> T merge(T local, T remote) throws IllegalAccessException, InstantiationException {
		Class<?> clazz = local.getClass();
		Object merged = clazz.newInstance();
		for (Field field : clazz.getDeclaredFields()) {
			field.setAccessible(true);
			Object localValue = field.get(local);
			Object remoteValue = field.get(remote);
			switch (field.getType().getSimpleName()) {
			case "Integer":
			case "String":
			case "Boolean":
			case "Long":
			case "LinkedHashMap":
				field.set(merged, (remoteValue != null) ? remoteValue : localValue);
				break;
			default:
				field.set(merged, merge(localValue, remoteValue));
			}
		}
		return (T) merged;
	}

}
