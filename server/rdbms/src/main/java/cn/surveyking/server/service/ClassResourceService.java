package cn.surveyking.server.service;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ClassResourceAssignRequest;
import cn.surveyking.server.domain.dto.ClassResourceDeleteRequest;
import cn.surveyking.server.domain.dto.ClassResourceUpdateRequest;
import cn.surveyking.server.domain.dto.ClassResourceView;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.ClassResource;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.Repo;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ClassResourceMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.RepoMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import javax.validation.ValidationException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 班级资源分配（P1 考试/问卷，P2 题库）。
 *
 * <p>规则（用户已确认）：
 * <ul>
 * <li>project：项目上的 {@code examSetting.startTime/endTime} 是**全局窗口，也是硬上限**；
 * 班级窗口（t_class_resource.start_at/end_at）为空表示继承全局，非空必须落在全局窗口内；</li>
 * <li>repo：题库有全局开放期（t_repo.open_start_at/open_end_at），是班级窗口的硬上限；
 * 班级窗口为空表示继承全局，非空时必须落在全局开放期内；</li>
 * <li>没有分配到某个班的考试/题库，该班学生完全看不到（连 ProjectNotFound 都不该区分出来）；</li>
 * <li>学生同时在多个班时，任一班的分配有效即可参加，解析时主组优先。</li>
 * </ul>
 *
 * <p>写操作统一走 {@link ClassService#assertManage(String)}（管理员 / class:grant / 班主任 /
 * access_level=2 授权），读面板也要求可管理：资源面板只对能管理这个班的老师开放。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClassResourceService {

	/** 学生视角的状态：手动关闭，或项目全局停用 */
	public static final String STATUS_CLOSED = "CLOSED";

	/** 还没到开始时间 */
	public static final String STATUS_NOT_STARTED = "NOT_STARTED";

	/** 可以参加 */
	public static final String STATUS_OPEN = "OPEN";

	/** 已经过了结束时间 */
	public static final String STATUS_ENDED = "ENDED";

	/**
	 * 资源类型 repo（题库）。t_class_resource 已预留这个类型，但 ClassResource 模型不归本任务管，
	 * 先在服务里放一份常量，避免跨文件改模型。
	 */
	public static final String RESOURCE_TYPE_REPO = "repo";

	private final ClassResourceMapper classResourceMapper;

	private final DeptMapper deptMapper;

	private final ProjectMapper projectMapper;

	private final RepoMapper repoMapper;

	private final AnswerMapper answerMapper;

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	/** 班级写权限判定的唯一出口；这里注入接口，不注入 ClassServiceImpl */
	private final ClassService classService;

	/**
	 * 班级资源面板：某个班已分配的资源（project 考试/问卷，repo 题库）。
	 * @param classId 班级 id（dept_type=class）
	 * @param resourceType 资源类型；为空按 project 处理
	 */
	public List<ClassResourceView> list(String classId, String resourceType) {
		String id = trim(classId);
		Dept dept = requireClass(id);
		classService.assertManage(id);
		String type = normalizeResourceType(resourceType);
		List<ClassResource> resources = classResourceMapper
				.selectList(Wrappers.<ClassResource>lambdaQuery().eq(ClassResource::getClassId, id)
						.eq(ClassResource::getResourceType, type).orderByAsc(ClassResource::getCreateAt));
		if (resources.isEmpty()) {
			return Collections.emptyList();
		}
		List<String> resourceIds = resources.stream().map(ClassResource::getResourceId)
				.filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		Map<String, User> assigners = loadUsers(resources.stream().map(ClassResource::getAssignedBy)
				.filter(StringUtils::hasText).distinct().collect(Collectors.toList()));
		if (RESOURCE_TYPE_REPO.equals(type)) {
			return toRepoViews(id, dept, resources, resourceIds, assigners);
		}
		return toProjectViews(id, dept, resources, resourceIds, assigners);
	}

	/** project 面板：带项目全局窗口、本班答卷数与「全局停用」状态 */
	private List<ClassResourceView> toProjectViews(String classId, Dept dept, List<ClassResource> resources,
			List<String> resourceIds, Map<String, User> assigners) {
		Map<String, Project> projects = loadProjects(resourceIds);
		Map<String, AnswerStat> answerStats = loadClassAnswerStats(classId, resourceIds);
		List<ClassResourceView> result = new ArrayList<>();
		for (ClassResource resource : resources) {
			if (resource == null) {
				continue;
			}
			Project project = projects.get(resource.getResourceId());
			ClassResourceView view = baseView(classId, dept, resource, assigners);
			if (project != null) {
				view.setResourceName(project.getName());
				view.setResourceMode(project.getMode());
			}
			view.setGlobalStartAt(toDate(globalStart(project)));
			view.setGlobalEndAt(toDate(globalEnd(project)));
			AnswerStat stat = answerStats.get(resource.getResourceId());
			view.setAnswerCount(stat == null ? 0L : stat.count);
			// 平均分：没有带分数的答卷就是 null（题库行不会走到这里，天然为 null）
			view.setAvgScore(stat == null ? null : stat.average());
			view.setEffectiveStatus(effectiveStatus(resource, project));
			result.add(view);
		}
		return result;
	}

	/** repo 面板：题库不产生答卷；全局开放期是班级窗口的硬上限，状态按「班级开关 + 全局 + 本班窗口」算 */
	private List<ClassResourceView> toRepoViews(String classId, Dept dept, List<ClassResource> resources,
			List<String> resourceIds, Map<String, User> assigners) {
		Map<String, Repo> repos = loadRepos(resourceIds);
		List<ClassResourceView> result = new ArrayList<>();
		for (ClassResource resource : resources) {
			if (resource == null) {
				continue;
			}
			Repo repo = repos.get(resource.getResourceId());
			ClassResourceView view = baseView(classId, dept, resource, assigners);
			if (repo != null) {
				view.setResourceName(repo.getName());
				// repo.mode 是自由字符串，转不进 ProjectModeEnum 就留空；前端按 resourceType 显示「题库」
				view.setResourceMode(toProjectMode(repo.getMode()));
			}
			// 题库的全局开放期（硬上限）；题库不存在时为空
			view.setGlobalStartAt(repo == null ? null : repo.getOpenStartAt());
			view.setGlobalEndAt(repo == null ? null : repo.getOpenEndAt());
			view.setAnswerCount(0L);
			view.setEffectiveStatus(effectiveStatusForRepo(resource, repo));
			result.add(view);
		}
		return result;
	}

	/** 两类资源共用的字段 */
	private ClassResourceView baseView(String classId, Dept dept, ClassResource resource,
			Map<String, User> assigners) {
		ClassResourceView view = new ClassResourceView();
		view.setId(resource.getId());
		view.setClassId(classId);
		view.setClassName(dept == null ? null : dept.getName());
		view.setResourceType(resource.getResourceType());
		view.setResourceId(resource.getResourceId());
		view.setStatus(resource.getStatus() == null ? 1 : resource.getStatus());
		view.setStartAt(resource.getStartAt());
		view.setEndAt(resource.getEndAt());
		view.setAssignedBy(resource.getAssignedBy());
		User assigner = assigners.get(resource.getAssignedBy());
		view.setAssignedByName(assigner == null ? null : assigner.getName());
		return view;
	}

	/**
	 * 给班级分配资源：按 (class_id, resource_type, resource_id) upsert。
	 *
	 * <p>已存在时更新窗口与班级开关，不改 assignedBy（谁先分的就记谁）。project 的班级窗口必须在
	 * 项目全局窗口内；repo（题库）没有全局窗口，只校验开始不晚于结束。
	 */
	@Transactional(rollbackFor = Exception.class)
	public void assign(ClassResourceAssignRequest request) {
		if (request == null) {
			throw new ValidationException("缺少分配参数");
		}
		String classId = trim(request.getClassId());
		requireClass(classId);
		classService.assertManage(classId);
		String type = normalizeResourceType(request.getResourceType());
		List<String> resourceIds = normalizeResourceIds(request.getResourceIds());
		if (resourceIds.isEmpty()) {
			throw new ValidationException(RESOURCE_TYPE_REPO.equals(type) ? "请选择要分配的题库" : "请选择要分配的考试");
		}
		// 前端传 epoch 毫秒，统一转 Date；空 = 继承全局 / 不限
		Date startAt = toDate(request.getStartAt());
		Date endAt = toDate(request.getEndAt());
		if (RESOURCE_TYPE_REPO.equals(type)) {
			// 题库：全局开放期是硬上限，班级窗口非空时必须落在里面
			Map<String, Repo> repos = loadRepos(resourceIds);
			if (repos.size() != resourceIds.size()) {
				throw new ValidationException("部分题库不存在，请刷新后重试");
			}
			for (String resourceId : resourceIds) {
				assertRepoAssignable(repos.get(resourceId), startAt, endAt);
			}
		}
		else {
			Map<String, Project> projects = loadProjects(resourceIds);
			if (projects.size() != resourceIds.size()) {
				throw new ValidationException("部分考试不存在，请刷新后重试");
			}
			for (String resourceId : resourceIds) {
				assertAssignable(projects.get(resourceId), startAt, endAt);
			}
		}
		int status = normalizeStatus(request.getStatus(), 1);
		String currentUserId = SecurityContextUtils.getUserId();
		for (String resourceId : resourceIds) {
			ClassResource exist = classResourceMapper
					.selectOne(Wrappers.<ClassResource>lambdaQuery().eq(ClassResource::getClassId, classId)
							.eq(ClassResource::getResourceType, type).eq(ClassResource::getResourceId, resourceId));
			if (exist == null) {
				ClassResource resource = new ClassResource();
				resource.setClassId(classId);
				resource.setResourceType(type);
				resource.setResourceId(resourceId);
				resource.setStatus(status);
				resource.setStartAt(startAt);
				resource.setEndAt(endAt);
				resource.setAssignedBy(currentUserId);
				classResourceMapper.insert(resource);
				continue;
			}
			// 已分配过：只更新窗口与开关（assign 传 null = 继承全局，必须真的写 NULL）
			updateWindow(exist.getId(), startAt, endAt, status);
		}
	}

	/** 修改一条分配：窗口与班级开关；status 不传表示不改 */
	@Transactional(rollbackFor = Exception.class)
	public void update(ClassResourceUpdateRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少分配记录 id");
		}
		ClassResource record = classResourceMapper.selectById(request.getId().trim());
		if (record == null) {
			throw new ValidationException("分配记录不存在，请刷新后重试");
		}
		classService.assertManage(record.getClassId());
		Date startAt = toDate(request.getStartAt());
		Date endAt = toDate(request.getEndAt());
		if (RESOURCE_TYPE_REPO.equals(record.getResourceType())) {
			// 题库：全局开放期是硬上限，班级窗口非空时必须落在里面
			assertRepoAssignable(repoMapper.selectById(record.getResourceId()), startAt, endAt);
		}
		else {
			Project project = projectMapper.selectById(record.getResourceId());
			assertAssignable(project, startAt, endAt);
		}
		Integer status = request.getStatus() == null ? null : Integer.valueOf(normalizeStatus(request.getStatus(), 1));
		updateWindow(record.getId(), startAt, endAt, status);
	}

	/** 取消一条分配 */
	@Transactional(rollbackFor = Exception.class)
	public void delete(ClassResourceDeleteRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少分配记录 id");
		}
		ClassResource record = classResourceMapper.selectById(request.getId().trim());
		if (record == null) {
			// 已经删掉的再删一次：幂等返回
			return;
		}
		classService.assertManage(record.getClassId());
		classResourceMapper.hardDelete(record.getId());
	}

	/**
	 * 解析某个学生对某个项目的「可参加班级」：返回命中的 classId；不适用（匿名 / staff / 无有效分配）返回 null。
	 * <p>给新建答卷写 {@code t_answer.class_id} 用：主组优先，主组无效时取任一有效分配。
	 */
	public String resolveForStudent(String projectId, String userId) {
		if (!StringUtils.hasText(projectId) || ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(projectId.trim())) {
			// 练习模式是伪项目（没有 t_project 行），不参与班级分配
			return null;
		}
		User student = loadStudent(userId);
		if (student == null) {
			return null;
		}
		List<String> classIds = studentClassIds(student);
		if (classIds.isEmpty()) {
			return null;
		}
		List<ClassResource> rows = loadAssignments(ClassResource.TYPE_PROJECT, projectId.trim(), classIds);
		if (rows.isEmpty()) {
			return null;
		}
		Project project = projectMapper.selectById(projectId.trim());
		Integer projectStatus = project == null ? null : project.getStatus();
		ProjectSetting setting = project == null ? null : project.getSetting();
		for (ClassResource row : rows) {
			if (invalidReason(row, projectStatus, setting) == null) {
				return row.getClassId();
			}
		}
		return null;
	}

	/**
	 * 学生能不能参加这场考试：未登录 / staff / 管理员直接放行；没分配到学生所在班 → ProjectNotFound；
	 * 未开始 / 已结束 / 手动关闭（或全局停用）分别抛对应业务错误。
	 */
	public void assertStudentCanAnswer(ProjectView project) {
		if (project == null || !StringUtils.hasText(project.getId())) {
			return;
		}
		// 练习模式（题库练习/错题本）走的是伪项目 id，没有 t_project 行，也没有班级分配，直接放行
		if (ExerciseProjectTemplate.EXERCISE_PROJECT_ID.equals(project.getId())) {
			return;
		}
		User student = loadStudent(SecurityContextUtils.getUserId());
		if (student == null) {
			return;
		}
		List<String> classIds = studentClassIds(student);
		if (classIds.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		List<ClassResource> rows = loadAssignments(ClassResource.TYPE_PROJECT, project.getId(), classIds);
		if (rows.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		ErrorCode reason = null;
		for (ClassResource row : rows) {
			ErrorCode invalid = invalidReason(row, project.getStatus(), project.getSetting());
			if (invalid == null) {
				return;
			}
			if (reason == null) {
				reason = invalid;
			}
		}
		throw new ErrorCodeException(reason == null ? ErrorCode.ProjectNotFound : reason);
	}

	/**
	 * 资源本身被删除时清理它的班级分配（例如题库删除）。
	 *
	 * <p>只按类型 + id 精确删；非法类型直接忽略，避免误删。逻辑删除即可：这些行不会再被列出，
	 * 资源已经不存在，也不存在「重新分配同一个 id」的场景。
	 */
	@Transactional(rollbackFor = Exception.class)
	public void removeByResource(String resourceType, String resourceId) {
		if (!StringUtils.hasText(resourceId) || !StringUtils.hasText(resourceType)) {
			return;
		}
		String type = resourceType.trim().toLowerCase(Locale.ROOT);
		if (!ClassResource.TYPE_PROJECT.equals(type) && !RESOURCE_TYPE_REPO.equals(type)) {
			return;
		}
		classResourceMapper.delete(Wrappers.<ClassResource>lambdaQuery()
				.eq(ClassResource::getResourceType, type).eq(ClassResource::getResourceId, resourceId.trim()));
	}

	/**
	 * 解析某个学生对某个题库的有效分配班级：返回命中的 classId；非学生 / 题库不存在 / 无有效分配返回 null。
	 *
	 * <p>有效 = 班级分配 status=1 + 题库全局开放期有效 + 本班窗口（为空继承全局）有效；主组优先。
	 */
	public String resolveForStudentRepo(String repoId, String userId) {
		if (!StringUtils.hasText(repoId)) {
			return null;
		}
		Repo repo = repoMapper.selectById(repoId.trim());
		if (repo == null) {
			return null;
		}
		User student = loadStudent(userId);
		if (student == null) {
			return null;
		}
		List<String> classIds = studentClassIds(student);
		if (classIds.isEmpty()) {
			return null;
		}
		for (ClassResource row : loadAssignments(RESOURCE_TYPE_REPO, repoId.trim(), classIds)) {
			if (invalidRepoReason(row, repo) == null) {
				return row.getClassId();
			}
		}
		return null;
	}

	/**
	 * 当前登录学生能否通过「班级分配」读这个题库（非学生 / 无有效分配 = false）。
	 *
	 * <p>给 RepoServiceImpl 的读闸门用：只做判定、不抛错，调用方决定抛什么。
	 */
	public boolean canStudentReadRepo(String repoId) {
		return resolveForStudentRepo(repoId, SecurityContextUtils.getUserId()) != null;
	}

	/**
	 * 题库练习入口用：学生只能访问分配给自己班的题库。
	 *
	 * <p>没分配 → 「无权限访问该题库」；分配了但关闭 / 未开始 / 已结束 → 对应业务错误；
	 * 非学生（教职工 / 管理员 / 匿名）直接放行。
	 */
	public void assertStudentCanAccessRepo(String repoId) {
		if (!StringUtils.hasText(repoId)) {
			return;
		}
		User student = loadStudent(SecurityContextUtils.getUserId());
		if (student == null) {
			return;
		}
		Repo repo = repoMapper.selectById(repoId.trim());
		List<String> classIds = studentClassIds(student);
		List<ClassResource> rows = classIds.isEmpty() || repo == null ? new ArrayList<>()
				: loadAssignments(RESOURCE_TYPE_REPO, repoId.trim(), classIds);
		if (rows.isEmpty()) {
			throw new AccessDeniedException("无权限访问该题库");
		}
		ErrorCode reason = null;
		for (ClassResource row : rows) {
			ErrorCode invalid = invalidRepoReason(row, repo);
			if (invalid == null) {
				return;
			}
			if (reason == null) {
				reason = invalid;
			}
		}
		throw new ErrorCodeException(reason == null ? ErrorCode.SurveySuspend : reason);
	}

	// ------ 内部

	private Dept requireClass(String classId) {
		String id = trim(classId);
		if (!StringUtils.hasText(id)) {
			throw new ValidationException("缺少班级 id");
		}
		Dept dept = deptMapper.selectById(id);
		if (dept == null) {
			throw new ValidationException("班级不存在");
		}
		if (!Dept.TYPE_CLASS.equals(dept.getDeptType())) {
			throw new ValidationException("该用户组不是班级");
		}
		return dept;
	}

	/** P2：支持 project（考试/问卷）与 repo（题库）；为空按 project 处理，其它类型直接拒绝 */
	private String normalizeResourceType(String resourceType) {
		if (!StringUtils.hasText(resourceType)) {
			return ClassResource.TYPE_PROJECT;
		}
		String normalized = resourceType.trim().toLowerCase(Locale.ROOT);
		if (!ClassResource.TYPE_PROJECT.equals(normalized) && !RESOURCE_TYPE_REPO.equals(normalized)) {
			throw new ValidationException("暂只支持考试/问卷与题库");
		}
		return normalized;
	}

	private List<String> normalizeResourceIds(List<String> resourceIds) {
		if (CollectionUtils.isEmpty(resourceIds)) {
			return Collections.emptyList();
		}
		return resourceIds.stream().map(this::trim).filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
	}

	/** status 只落 0 / 1；不传取默认值 */
	private int normalizeStatus(Integer status, int defaultValue) {
		if (status == null) {
			return defaultValue;
		}
		return status == 0 ? 0 : 1;
	}

	/** 班级窗口自身合法：开始不能晚于结束（project 的全局上限另由 assertAssignable 校验） */
	private void assertWindowOrder(Date startAt, Date endAt) {
		if (startAt != null && endAt != null && startAt.getTime() > endAt.getTime()) {
			throw new ValidationException("班级开始时间不能晚于结束时间");
		}
	}

	private void assertAssignable(Project project, Date startAt, Date endAt) {
		if (project == null) {
			throw new ValidationException("考试不存在，请刷新后重试");
		}
		if (ProjectModeEnum.folder.equals(project.getMode())) {
			throw new ValidationException("文件夹不能分配给班级");
		}
		Long globalStartAt = globalStart(project);
		Long globalEndAt = globalEnd(project);
		assertWindowOrder(startAt, endAt);
		// 全局窗口是硬上限：班级窗口只能在它里面，不能借班级设置把窗口放宽
		if (startAt != null && globalStartAt != null && startAt.getTime() < globalStartAt) {
			throw new ValidationException("班级开放时间必须在全局开放时间内");
		}
		if (endAt != null && globalEndAt != null && endAt.getTime() > globalEndAt) {
			throw new ValidationException("班级开放时间必须在全局开放时间内");
		}
	}

	/**
	 * 题库的班级窗口校验：题库全局开放期是硬上限。
	 *
	 * <p>start / end 都为空 = 继承全局；非空时先保证开始不晚于结束，再保证非空的那一端不越出全局开放期。
	 */
	private void assertRepoAssignable(Repo repo, Date startAt, Date endAt) {
		if (repo == null) {
			throw new ValidationException("题库不存在，请刷新后重试");
		}
		assertWindowOrder(startAt, endAt);
		Long globalStartAt = safeTime(repo.getOpenStartAt());
		Long globalEndAt = safeTime(repo.getOpenEndAt());
		if (startAt != null && globalStartAt != null && startAt.getTime() < globalStartAt) {
			throw new ValidationException("题库开放时间必须在全局开放时间内");
		}
		if (endAt != null && globalEndAt != null && endAt.getTime() > globalEndAt) {
			throw new ValidationException("题库开放时间必须在全局开放时间内");
		}
	}

	/** 显式写窗口：null 表示继承全局，必须真的落 NULL（updateById 会跳过 null 字段） */
	private void updateWindow(String id, Date startAt, Date endAt, Integer status) {
		LambdaUpdateWrapper<ClassResource> wrapper = Wrappers.<ClassResource>lambdaUpdate()
				.eq(ClassResource::getId, id).set(ClassResource::getStartAt, startAt)
				.set(ClassResource::getEndAt, endAt);
		if (status != null) {
			wrapper.set(ClassResource::getStatus, status);
		}
		classResourceMapper.update(null, wrapper);
	}

	private Map<String, Project> loadProjects(List<String> projectIds) {
		if (CollectionUtils.isEmpty(projectIds)) {
			return Collections.emptyMap();
		}
		return projectMapper.selectBatchIds(projectIds).stream().filter(Objects::nonNull)
				.collect(Collectors.toMap(Project::getId, project -> project, (a, b) -> a));
	}

	private Map<String, Repo> loadRepos(List<String> repoIds) {
		if (CollectionUtils.isEmpty(repoIds)) {
			return Collections.emptyMap();
		}
		return repoMapper.selectBatchIds(repoIds).stream().filter(Objects::nonNull)
				.collect(Collectors.toMap(Repo::getId, repo -> repo, (a, b) -> a));
	}

	/** repo.mode 是自由字符串，转不进 ProjectModeEnum 就返回 null（前端按 resourceType 显示「题库」） */
	private ProjectModeEnum toProjectMode(String mode) {
		if (!StringUtils.hasText(mode)) {
			return null;
		}
		try {
			return ProjectModeEnum.valueOf(mode.trim().toLowerCase(Locale.ROOT));
		}
		catch (Exception e) {
			return null;
		}
	}

	private Map<String, User> loadUsers(List<String> userIds) {
		if (CollectionUtils.isEmpty(userIds)) {
			return Collections.emptyMap();
		}
		return userMapper.selectBatchIds(userIds).stream().filter(Objects::nonNull)
				.collect(Collectors.toMap(User::getId, user -> user, (a, b) -> a));
	}

	/**
	 * 本班每个项目的答卷数与平均分：一次查询把 project_id + exam_score 取回来在内存里聚合，
	 * 避免每个项目各查一次库。口径：t_answer 的 project_id + class_id + temp_save=1
	 * （逻辑删除由 @TableLogic 处理），平均分等价于 AVG(exam_score)（忽略 null 分数）。
	 */
	private Map<String, AnswerStat> loadClassAnswerStats(String classId, List<String> projectIds) {
		Map<String, AnswerStat> stats = new HashMap<>();
		if (CollectionUtils.isEmpty(projectIds)) {
			return stats;
		}
		answerMapper
				.selectList(Wrappers.<Answer>lambdaQuery().select(Answer::getProjectId, Answer::getExamScore)
						.eq(Answer::getTempSave, 1).eq(Answer::getIsAnonymous, false)
						.eq(Answer::getClassId, classId).in(Answer::getProjectId, projectIds))
				.forEach(answer -> {
					if (answer == null || !StringUtils.hasText(answer.getProjectId())) {
						return;
					}
					AnswerStat stat = stats.computeIfAbsent(answer.getProjectId(), key -> new AnswerStat());
					stat.count++;
					if (answer.getExamScore() != null) {
						stat.scoreSum += answer.getExamScore();
						stat.scoredCount++;
					}
				});
		return stats;
	}

	/** 单个项目的班级答卷统计：答卷数 + 有分数的答卷数与总分 */
	private static final class AnswerStat {

		private long count;

		private double scoreSum;

		private long scoredCount;

		/** 平均分：没有带分数的答卷就返回 null（问卷模式 / 未判分） */
		private Double average() {
			return scoredCount == 0 ? null : scoreSum / scoredCount;
		}

	}

	private String effectiveStatus(ClassResource resource, Project project) {
		if (resource == null || !Integer.valueOf(1).equals(resource.getStatus())) {
			return STATUS_CLOSED;
		}
		if (project == null || !Integer.valueOf(1).equals(project.getStatus())) {
			return STATUS_CLOSED;
		}
		Long start = safeTime(resource.getStartAt());
		if (start == null) {
			start = globalStart(project);
		}
		Long end = safeTime(resource.getEndAt());
		if (end == null) {
			end = globalEnd(project);
		}
		long now = System.currentTimeMillis();
		if (start != null && now < start) {
			return STATUS_NOT_STARTED;
		}
		if (end != null && now > end) {
			return STATUS_ENDED;
		}
		return STATUS_OPEN;
	}

	/** 这一行对学生的不可用原因；null 表示可以参加 */
	private ErrorCode invalidReason(ClassResource row, Integer projectStatus, ProjectSetting setting) {
		if (row == null) {
			return ErrorCode.ProjectNotFound;
		}
		if (!Integer.valueOf(1).equals(row.getStatus())) {
			return ErrorCode.SurveySuspend;
		}
		if (projectStatus == null || projectStatus != 1) {
			return ErrorCode.SurveySuspend;
		}
		Long start = safeTime(row.getStartAt());
		if (start == null) {
			start = examStart(setting);
		}
		Long end = safeTime(row.getEndAt());
		if (end == null) {
			end = examEnd(setting);
		}
		long now = System.currentTimeMillis();
		if (start != null && now < start) {
			return ErrorCode.ExamUnStarted;
		}
		if (end != null && now > end) {
			return ErrorCode.ExamFinished;
		}
		return null;
	}

	/**
	 * 题库行的不可用原因：班级开关 + 题库全局开放期（硬上限）+ 本班窗口（为空继承全局）。
	 *
	 * <p>题库不存在（已删除）视为不可访问；不读 project 的任何状态。
	 */
	private ErrorCode invalidRepoReason(ClassResource row, Repo repo) {
		if (row == null || repo == null) {
			return ErrorCode.ProjectNotFound;
		}
		if (!Integer.valueOf(1).equals(row.getStatus())) {
			return ErrorCode.SurveySuspend;
		}
		long now = System.currentTimeMillis();
		Long globalStart = safeTime(repo.getOpenStartAt());
		Long globalEnd = safeTime(repo.getOpenEndAt());
		// 先判题库全局开放期：它是硬上限，班级窗口只能在里面
		if (globalStart != null && now < globalStart) {
			return ErrorCode.ExamUnStarted;
		}
		if (globalEnd != null && now > globalEnd) {
			return ErrorCode.ExamFinished;
		}
		Long start = safeTime(row.getStartAt());
		if (start == null) {
			start = globalStart;
		}
		Long end = safeTime(row.getEndAt());
		if (end == null) {
			end = globalEnd;
		}
		if (start != null && now < start) {
			return ErrorCode.ExamUnStarted;
		}
		if (end != null && now > end) {
			return ErrorCode.ExamFinished;
		}
		return null;
	}

	/**
	 * 题库面板状态：班级开关 → 题库全局开放期（硬上限）→ 本班窗口（为空用全局）。
	 *
	 * <p>不读 project 的任何状态（题库与考试是两套窗口模型）。
	 */
	private String effectiveStatusForRepo(ClassResource resource, Repo repo) {
		if (resource == null || !Integer.valueOf(1).equals(resource.getStatus())) {
			return STATUS_CLOSED;
		}
		long now = System.currentTimeMillis();
		Long globalStart = repo == null ? null : safeTime(repo.getOpenStartAt());
		Long globalEnd = repo == null ? null : safeTime(repo.getOpenEndAt());
		if (globalStart != null && now < globalStart) {
			return STATUS_NOT_STARTED;
		}
		if (globalEnd != null && now > globalEnd) {
			return STATUS_ENDED;
		}
		Long start = safeTime(resource.getStartAt());
		if (start == null) {
			start = globalStart;
		}
		Long end = safeTime(resource.getEndAt());
		if (end == null) {
			end = globalEnd;
		}
		if (start != null && now < start) {
			return STATUS_NOT_STARTED;
		}
		if (end != null && now > end) {
			return STATUS_ENDED;
		}
		return STATUS_OPEN;
	}

	private Long globalStart(Project project) {
		try {
			return examStart(project == null ? null : project.getSetting());
		}
		catch (Exception e) {
			log.warn("读取项目全局开始时间失败 projectId={}", project == null ? null : project.getId(), e);
			return null;
		}
	}

	private Long globalEnd(Project project) {
		try {
			return examEnd(project == null ? null : project.getSetting());
		}
		catch (Exception e) {
			log.warn("读取项目全局结束时间失败 projectId={}", project == null ? null : project.getId(), e);
			return null;
		}
	}

	private Long examStart(ProjectSetting setting) {
		try {
			ProjectSetting.ExamSetting examSetting = setting == null ? null : setting.getExamSetting();
			return examSetting == null ? null : examSetting.getStartTime();
		}
		catch (Exception e) {
			log.warn("读取考试全局开始时间失败", e);
			return null;
		}
	}

	private Long examEnd(ProjectSetting setting) {
		try {
			ProjectSetting.ExamSetting examSetting = setting == null ? null : setting.getExamSetting();
			return examSetting == null ? null : examSetting.getEndTime();
		}
		catch (Exception e) {
			log.warn("读取考试全局结束时间失败", e);
			return null;
		}
	}

	private Date toDate(Long millis) {
		return millis == null ? null : new Date(millis);
	}

	/** 时间字段的空安全取值：Date 本身或 getTime 异常都按 null 处理 */
	private Long safeTime(Date date) {
		if (date == null) {
			return null;
		}
		try {
			return date.getTime();
		}
		catch (Exception e) {
			log.warn("读取班级资源时间失败", e);
			return null;
		}
	}

	private String trim(String value) {
		return value == null ? null : value.trim();
	}

	/** 登录用户若是 student 返回该用户；匿名 / staff / 管理员返回 null（他们对班级分配免疫） */
	private User loadStudent(String userId) {
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			return null;
		}
		User user = userMapper.selectById(userId);
		if (user == null || !"student".equals(user.getUserType())) {
			return null;
		}
		return user;
	}

	/** 学员所属班级：主组在前（主班优先），附加组按绑定时间在后，去重 */
	private List<String> studentClassIds(User student) {
		Set<String> classIds = new LinkedHashSet<>();
		if (student == null) {
			return new ArrayList<>(classIds);
		}
		if (StringUtils.hasText(student.getDeptId())) {
			classIds.add(student.getDeptId().trim());
		}
		List<UserDept> extraBindings = userDeptMapper
				.selectList(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getUserId, student.getId())
						.orderByAsc(UserDept::getCreateAt));
		for (UserDept binding : extraBindings) {
			if (binding != null && StringUtils.hasText(binding.getDeptId())) {
				classIds.add(binding.getDeptId().trim());
			}
		}
		return new ArrayList<>(classIds);
	}

	/** 学生班级上、某个资源的全部分配行（主班在前；含 status=0 的行，用来区分「关闭」与「未分配」） */
	private List<ClassResource> loadAssignments(String resourceType, String resourceId, List<String> classIds) {
		if (!StringUtils.hasText(resourceId) || CollectionUtils.isEmpty(classIds)) {
			return new ArrayList<>();
		}
		List<ClassResource> rows = classResourceMapper
				.selectList(Wrappers.<ClassResource>lambdaQuery()
						.eq(ClassResource::getResourceType, resourceType)
						.eq(ClassResource::getResourceId, resourceId).in(ClassResource::getClassId, classIds));
		if (rows.size() > 1) {
			Map<String, Integer> order = new HashMap<>();
			for (int index = 0; index < classIds.size(); index++) {
				order.put(classIds.get(index), index);
			}
			rows.sort(Comparator.comparingInt((ClassResource row) -> order.getOrDefault(row.getClassId(),
					Integer.MAX_VALUE)));
		}
		return rows;
	}

}
