package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.uitls.ClassUtils;
import cn.surveyking.server.core.uitls.NanoIdUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.ProjectViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.validation.ValidationException;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import static com.baomidou.mybatisplus.core.toolkit.StringUtils.isNotBlank;
import static org.apache.commons.lang3.StringUtils.isBlank;

/**
 * @author javahuang
 * @date 2021/8/3
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ProjectServiceImpl extends BaseService<ProjectMapper, Project> implements ProjectService {

	private final AnswerMapper answerMapper;

	private final ProjectViewMapper projectViewMapper;

	private final ProjectPartnerService projectPartnerService;

	private SpelExpressionParser spelParser = new SpelExpressionParser();

	private List<String> projectSettingUpdateKeys;

	@Override
	public PaginationResponse<ProjectView> listProject(ProjectQuery query) {
		// 说明：项目列表的可见性判定全部落在下面的 EXISTS 子查询里，
		// 依赖 t_user_dept（附加组）与 t_dept 的祖先链，改这段务必跑一次
		// scripts/nas/Deploy-Nas.ps1 让冒烟测试覆盖到「试卷能列出来」。
		Page<Project> page = pageByQuery(query, Wrappers.<Project>lambdaQuery()
				.like(isNotBlank(query.getName()), Project::getName, query.getName())
				.eq(isNotBlank(query.getParentId()), Project::getParentId, query.getParentId())
				// 父id为空或者为 0 表示一级目录
				.and(isBlank(query.getParentId()),
						c -> c.isNull(Project::getParentId).or().eq(Project::getParentId, "0"))
				.eq(query.getMode() != null, Project::getMode, query.getMode())
				// 可见性：本人被授权(type 1/2/3)，或所在用户组被授权（group_id 存 dept id；主组 + 附加组，含祖先链）
				// 注意：不能加 t.is_deleted = 0 —— t_project_partner 没有这列（ProjectPartner 把
				// BaseModel.deleted 覆盖成了 @TableField(exist = false)，删除走的是物理 DELETE）。
				// 加了会直接 500：Unknown column 't.is_deleted' in 'IN/ALL/ANY subquery'。
				.exists("SELECT 1 FROM t_project_partner t WHERE t.project_id = t_project.id"
						+ " AND (t.user_id = {0} OR (t.group_id IS NOT NULL AND t.group_id IN ("
						+ UserDeptScopeService.DEPT_SCOPE_SQL + ")))"
						+ " AND t.type IN (1, 2, 3)",
						SecurityContextUtils.getUserId())
				// 文件夹排在前面，然后按创建时间从近到远排序
				.last("ORDER BY CASE WHEN mode = 'folder' THEN 0 ELSE 1 END ASC, create_at DESC"));
		PaginationResponse<ProjectView> result = new PaginationResponse<>(page.getTotal(),
				projectViewMapper.toView(page.getRecords()));
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

	public ProjectView getProject(String id) {
		if (ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(id)) {
			return ExerciseProjectTemplate.getExerciseTemplate();
		}
		return projectViewMapper.toView(getById(id));
	}

	@Override
	public ProjectView addProject(ProjectRequest request) {
		Project project = projectViewMapper.fromRequest(request);
		// 第三方/脚本建项目通常不传 setting。setting 为 null 时，后续
		// /project/update(settingKey) 会在 SpEL setValue 处 NPE、/public/loadProject 与
		// /public/saveAnswer 会走 getSetting().getXxx() NPE / 4004（见 docs/audit/concurrency-test.md §3）。
		// 这里补齐成与前端「新建项目」一致的默认结构，调用方显式给的值一律保留。
		project.setSetting(completeSetting(project.getSetting()));
		// project.status 与 setting.status 保持一致：前端建项目只传 setting.status，
		// 第三方直接传 setting.status=1 时也应当算已发布。
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

		ProjectPartnerRequest partnerRequest = new ProjectPartnerRequest();
		partnerRequest.setType(ProjectPartnerTypeEnum.OWNER.getType());
		partnerRequest.setProjectId(project.getId());
		partnerRequest.setUserIds(Collections.singletonList(SecurityContextUtils.getUserId()));
		projectPartnerService.addProjectPartner(partnerRequest);
		return projectViewMapper.toView(project);
	}

	/**
	 * 把 ProjectSetting 补齐成完整结构：缺整份就给默认值，缺某一层子结构就补该层。
	 *
	 * <p>
	 * 默认值与前端「新建项目」提交的 DEFAULT_SETTING 对齐（status=0 未发布、进度条与自动保存开启）。
	 * 显式传入的值（包括 false）不会被覆盖。
	 */
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
		// 不要以数字开头，否则工作流 xml 保存会报错
		if (Character.isDigit(projectId.charAt(0))) {
			return generateProjectId();
		}
		if (getById(projectId) != null) {
			return generateProjectId();
		}
		return projectId;
	}

	@Override
	@SneakyThrows
	public void updateProject(ProjectRequest request) {
		synchronized (request.getId().intern()) {
			Project project = projectViewMapper.fromRequest(request);
			if (request.getSettingKey() != null) {
				validateSettingKey(request.getSettingKey());
				// 实现单个设置的更新
				Project existing = getById(request.getId());
				// 历史遗留：修 addProject 之前创建的项目 setting 可能是 null（或只有部分子结构），
				// 这里先补齐再改，否则 SpEL 的 setValue 会直接 NPE。补齐结果会随这次 update 落库，等于自愈。
				ProjectSetting setting = completeSetting(existing == null ? null : existing.getSetting());
				spelParser.parseExpression(request.getSettingKey()).setValue(setting, request.getSettingValue());
				project.setSetting(setting);
				// 同步更新项目状态
				if ("status".equals(request.getSettingKey())) {
					project.setStatus((Integer) request.getSettingValue());
				}
			}
			updateById(project);
		}
	}

	/**
	 * spel漏洞修复，只允许更新指定参数
	 * @param expressionString
	 */
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
		removeById(request.getId());
	}

	@Override
	public ProjectSetting getSetting(ProjectQuery query) {
		// 上游这里是个返回 null 的桩，导致「设置」页打开时永远是空的（保存了也不回显）
		Project project = getById(query.getId());
		if (project == null || project.getSetting() == null) {
			return new ProjectSetting();
		}
		ProjectSetting setting = project.getSetting();
		if (setting == null) {
			return new ProjectSetting();
		}
		// 访问密码不回传给前端，避免在页面上明文暴露
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
				view.setTotal(answerMapper
						.selectCount(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, view.getId())));
			}
		});
		return list;
	}

	@Override
	public void batchDestroyProject(ProjectRequest request) {
		List<String> ids = assertProjectIdsPermitted(request.getIds());
		getBaseMapper().batchDestroy(ids);
		// 删除项目参与者
		projectPartnerService.deleteAllProjectPartners(ids);
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
