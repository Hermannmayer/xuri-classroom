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
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ClassResourceMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * 班级资源分配（P1：考试/问卷）。
 *
 * <p>规则（用户已确认）：
 * <ul>
 * <li>项目上的 {@code examSetting.startTime/endTime} 是**全局窗口，也是硬上限**；</li>
 * <li>班级窗口（t_class_resource.start_at/end_at）为空表示继承全局，非空必须落在全局窗口内；</li>
 * <li>没有分配到某个班的考试，该班学生完全看不到（连 ProjectNotFound 都不该区分出来）；</li>
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

	private final ClassResourceMapper classResourceMapper;

	private final DeptMapper deptMapper;

	private final ProjectMapper projectMapper;

	private final AnswerMapper answerMapper;

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	/** 班级写权限判定的唯一出口；这里注入接口，不注入 ClassServiceImpl */
	private final ClassService classService;

	/**
	 * 班级资源面板：某个班已分配的资源（P1 只有 project）。
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
		Map<String, Project> projects = loadProjects(resourceIds);
		Map<String, Long> answerCounts = countAnswersByProject(id, resourceIds);
		Map<String, User> assigners = loadUsers(resources.stream().map(ClassResource::getAssignedBy)
				.filter(StringUtils::hasText).distinct().collect(Collectors.toList()));
		List<ClassResourceView> result = new ArrayList<>();
		for (ClassResource resource : resources) {
			if (resource == null) {
				continue;
			}
			Project project = projects.get(resource.getResourceId());
			ClassResourceView view = new ClassResourceView();
			view.setId(resource.getId());
			view.setClassId(id);
			view.setClassName(dept.getName());
			view.setResourceType(resource.getResourceType());
			view.setResourceId(resource.getResourceId());
			if (project != null) {
				view.setResourceName(project.getName());
				view.setResourceMode(project.getMode());
			}
			view.setStatus(resource.getStatus() == null ? 1 : resource.getStatus());
			view.setStartAt(resource.getStartAt());
			view.setEndAt(resource.getEndAt());
			view.setGlobalStartAt(toDate(globalStart(project)));
			view.setGlobalEndAt(toDate(globalEnd(project)));
			view.setAssignedBy(resource.getAssignedBy());
			User assigner = assigners.get(resource.getAssignedBy());
			view.setAssignedByName(assigner == null ? null : assigner.getName());
			Long answerCount = answerCounts.get(resource.getResourceId());
			view.setAnswerCount(answerCount == null ? 0L : answerCount);
			view.setEffectiveStatus(effectiveStatus(resource, project));
			result.add(view);
		}
		return result;
	}

	/**
	 * 给班级分配资源：按 (class_id, resource_type, resource_id) upsert。
	 *
	 * <p>已存在时更新窗口与班级开关，不改 assignedBy（谁先分的就记谁）；班级窗口必须在全局窗口内。
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
			throw new ValidationException("请选择要分配的考试");
		}
		Map<String, Project> projects = loadProjects(resourceIds);
		if (projects.size() != resourceIds.size()) {
			throw new ValidationException("部分考试不存在，请刷新后重试");
		}
		// 前端传 epoch 毫秒，统一转 Date；空 = 继承全局
		Date startAt = toDate(request.getStartAt());
		Date endAt = toDate(request.getEndAt());
		for (String resourceId : resourceIds) {
			assertAssignable(projects.get(resourceId), startAt, endAt);
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
		Project project = projectMapper.selectById(record.getResourceId());
		Date startAt = toDate(request.getStartAt());
		Date endAt = toDate(request.getEndAt());
		assertAssignable(project, startAt, endAt);
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
		List<ClassResource> rows = loadAssignments(projectId.trim(), classIds);
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
		List<ClassResource> rows = loadAssignments(project.getId(), classIds);
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

	/** P1 只支持 project；为空按 project 处理，其它类型直接拒绝 */
	private String normalizeResourceType(String resourceType) {
		if (!StringUtils.hasText(resourceType)) {
			return ClassResource.TYPE_PROJECT;
		}
		String normalized = resourceType.trim().toLowerCase(Locale.ROOT);
		if (!ClassResource.TYPE_PROJECT.equals(normalized)) {
			throw new ValidationException("暂只支持考试/问卷");
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

	private void assertAssignable(Project project, Date startAt, Date endAt) {
		if (project == null) {
			throw new ValidationException("考试不存在，请刷新后重试");
		}
		if (ProjectModeEnum.folder.equals(project.getMode())) {
			throw new ValidationException("文件夹不能分配给班级");
		}
		Long globalStartAt = globalStart(project);
		Long globalEndAt = globalEnd(project);
		if (startAt != null && endAt != null && startAt.getTime() > endAt.getTime()) {
			throw new ValidationException("班级开始时间不能晚于结束时间");
		}
		// 全局窗口是硬上限：班级窗口只能在它里面，不能借班级设置把窗口放宽
		if (startAt != null && globalStartAt != null && startAt.getTime() < globalStartAt) {
			throw new ValidationException("班级开放时间必须在全局开放时间内");
		}
		if (endAt != null && globalEndAt != null && endAt.getTime() > globalEndAt) {
			throw new ValidationException("班级开放时间必须在全局开放时间内");
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

	private Map<String, User> loadUsers(List<String> userIds) {
		if (CollectionUtils.isEmpty(userIds)) {
			return Collections.emptyMap();
		}
		return userMapper.selectBatchIds(userIds).stream().filter(Objects::nonNull)
				.collect(Collectors.toMap(User::getId, user -> user, (a, b) -> a));
	}

	/** 本班已交卷数：t_answer 按 project_id + class_id + temp_save=1（逻辑删除由 @TableLogic 处理） */
	private Map<String, Long> countAnswersByProject(String classId, List<String> projectIds) {
		Map<String, Long> counts = new HashMap<>();
		if (CollectionUtils.isEmpty(projectIds)) {
			return counts;
		}
		answerMapper
				.selectList(Wrappers.<Answer>lambdaQuery().select(Answer::getProjectId)
						.eq(Answer::getTempSave, 1).eq(Answer::getClassId, classId)
						.in(Answer::getProjectId, projectIds))
				.forEach(answer -> counts.merge(answer.getProjectId(), 1L, Long::sum));
		return counts;
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

	/** 学生班级上、这个项目的全部分配行（主班在前；含 status=0 的行，用来区分「关闭」与「未分配」） */
	private List<ClassResource> loadAssignments(String projectId, List<String> classIds) {
		if (!StringUtils.hasText(projectId) || CollectionUtils.isEmpty(classIds)) {
			return new ArrayList<>();
		}
		List<ClassResource> rows = classResourceMapper
				.selectList(Wrappers.<ClassResource>lambdaQuery()
						.eq(ClassResource::getResourceType, ClassResource.TYPE_PROJECT)
						.eq(ClassResource::getResourceId, projectId).in(ClassResource::getClassId, classIds));
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
