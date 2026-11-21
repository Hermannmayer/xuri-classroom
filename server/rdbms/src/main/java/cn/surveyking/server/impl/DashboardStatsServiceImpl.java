package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.DashboardOverviewView;
import cn.surveyking.server.domain.dto.DashboardTrendView;
import cn.surveyking.server.domain.dto.ExerciseProjectTemplate;
import cn.surveyking.server.domain.dto.StudentDashboardView;
import cn.surveyking.server.domain.dto.TeacherDashboardView;
import cn.surveyking.server.domain.model.AiUsage;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerItem;
import cn.surveyking.server.domain.model.ClassResource;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.domain.model.Repo;
import cn.surveyking.server.domain.model.Template;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserDept;
import cn.surveyking.server.mapper.AiUsageMapper;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ClassResourceMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.mapper.RepoMapper;
import cn.surveyking.server.mapper.TemplateMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.DashboardStatsService;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

































@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardStatsServiceImpl implements DashboardStatsService {


	private static final int DEFAULT_DAYS = 14;


	private static final int MAX_DAYS = 90;


	private static final int RECENT_DAYS = 7;


	private static final int MONTH_DAYS = 30;


	private static final int FORMAL = 1;


	private static final String GRADE_GRADED = "graded";


	private static final String GRADE_PENDING = "pending";


	private static final int PASS_SCORE = 60;


	private static final String EXERCISE_PROJECT_ID = ExerciseProjectTemplate.EXERCISE_PROJECT_ID;


	private static final int RECENT_PROJECT_LIMIT = 8;








	private static final int RECENT_ANSWER_LIMIT = 20;
















	private static final String ADMIN_USER_SQL = "EXISTS (SELECT 1 FROM t_user_role ur JOIN t_role r ON r.id = ur.role_id "
			+ "WHERE ur.user_id = t_user.id AND r.code = 'admin' AND r.is_deleted = 0) "
			+ "OR EXISTS (SELECT 1 FROM t_account a WHERE a.user_id = t_user.id "
			+ "AND a.auth_account = 'admin' AND a.is_deleted = 0)";







	private static final String PUBLISHED_RESOURCE_SQL = "EXISTS (SELECT 1 FROM t_project p "
			+ "WHERE p.id = t_class_resource.resource_id AND p.is_deleted = 0 AND p.status = 1)";


	private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MM-dd");



	private final AnswerMapper answerMapper;

	private final AnswerItemMapper answerItemMapper;

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	private final DeptMapper deptMapper;

	private final ProjectMapper projectMapper;

	private final ProjectPartnerMapper projectPartnerMapper;

	private final ClassResourceMapper classResourceMapper;

	private final RepoMapper repoMapper;

	private final TemplateMapper templateMapper;

	private final AiUsageMapper aiUsageMapper;


	private final UserDeptScopeService userDeptScopeService;


	private final ClassService classService;


	private final ObjectMapper objectMapper;

	// ------ 总览

	@Override
	public DashboardOverviewView overview(int days) {


		normalizeDays(days);
		DashboardOverviewView view = new DashboardOverviewView();
		fillUsers(view.getUsers());
		fillProjects(view.getProjects());
		fillClasses(view.getClasses());
		fillAnswers(view.getAnswers());
		fillQuestions(view.getQuestions());
		fillScores(view.getScores());
		fillAi(view.getAi());
		return view;
	}

	/** 人：学员 / 老师 / 管理员互斥，合计就是三者之和 */
	private void fillUsers(DashboardOverviewView.Users users) {
		long admins = safeCount("users.admin",
				() -> userMapper.selectCount(new QueryWrapper<User>().apply(ADMIN_USER_SQL)));
		long students = safeCount("users.student", () -> userMapper
				.selectCount(new QueryWrapper<User>().eq("user_type", "student").apply("NOT (" + ADMIN_USER_SQL + ")")));
		long teachers = safeCount("users.teacher", () -> userMapper
				.selectCount(new QueryWrapper<User>().eq("user_type", "staff").apply("NOT (" + ADMIN_USER_SQL + ")")));
		users.setAdmin(admins);
		users.setStudent(students);
		users.setTeacher(teachers);
		users.setTotal(admins + students + teachers);


		users.setActive7d(safeCount("users.active7d", () -> {
			List<Map<String, Object>> rows = answerMapper.selectMaps(formalAnswers()
					.select("COUNT(DISTINCT create_by) AS cnt").isNotNull("create_by").ge("create_at", daysAgo(RECENT_DAYS)));
			return asLong(firstRow(rows).get("cnt"));
		}));
	}

	/** 项目：一次 group by (mode, status) 拿到全部计数，再单独解析「进行中」 */
	private void fillProjects(DashboardOverviewView.Projects projects) {
		List<Map<String, Object>> rows = safe("projects.count", () -> projectMapper.selectMaps(new QueryWrapper<Project>()
				.select("mode", "status", "COUNT(*) AS cnt").groupBy("mode", "status")), Collections.emptyList());
		long total = 0;
		long exam = 0;
		long survey = 0;
		long folder = 0;
		long published = 0;
		for (Map<String, Object> row : rows) {
			if (row == null) {
				continue;
			}
			long count = asLong(row.get("cnt"));
			total += count;
			String mode = asString(row.get("mode"));
			if (ProjectModeEnum.exam.name().equalsIgnoreCase(mode)) {
				exam += count;
			}
			else if (ProjectModeEnum.survey.name().equalsIgnoreCase(mode)) {
				survey += count;
			}
			else if (ProjectModeEnum.folder.name().equalsIgnoreCase(mode)) {
				folder += count;
			}
			if (Integer.valueOf(1).equals(asInteger(row.get("status")))) {
				published += count;
			}
		}
		projects.setTotal(total);
		projects.setExam(exam);
		projects.setSurvey(survey);
		projects.setFolder(folder);
		projects.setPublished(published);
		projects.setRunning(safe("projects.running", this::countRunningExams, 0L));
	}

	/** 进行中的考试：mode=exam + status=1 + 当前落在 [startTime, endTime] 内（两端为空表示不限） */
	private long countRunningExams() {
		List<Map<String, Object>> rows = projectMapper.selectMaps(new QueryWrapper<Project>().select("id", "setting")
				.eq("mode", ProjectModeEnum.exam.name()).eq("status", 1));
		long now = System.currentTimeMillis();
		long running = 0;
		for (Map<String, Object> row : rows) {
			Long[] window = examWindow(asString(row == null ? null : row.get("setting")));
			if (isOpen(window[0], window[1], now)) {
				running++;
			}
		}
		return running;
	}

	/** 班级：总数 / 开班中 / 在册学员 / 平均班额 */
	private void fillClasses(DashboardOverviewView.Classes classes) {
		List<Map<String, Object>> classRows = safe("classes.list",
				() -> deptMapper.selectMaps(new QueryWrapper<Dept>().select("id", "class_kind").eq("dept_type", Dept.TYPE_CLASS)),
				Collections.emptyList());
		classes.setTotal(classRows.size());
		if (classRows.isEmpty()) {
			classes.setStudents(0L);
			classes.setOpen(0L);
			classes.setAvgSize(0D);
			return;
		}
		Set<String> classIds = new LinkedHashSet<>();
		Set<String> teachingIds = new LinkedHashSet<>();
		for (Map<String, Object> row : classRows) {
			String id = asString(row == null ? null : row.get("id"));
			if (!StringUtils.hasText(id)) {
				continue;
			}
			classIds.add(id);
			if (!Dept.CLASS_KIND_GROUP.equalsIgnoreCase(asString(row.get("class_kind")))) {
				teachingIds.add(id);
			}
		}

		Map<String, Long> primaryMembers = safe("classes.members", () -> {
			Map<String, Long> counts = new HashMap<>();
			for (Map<String, Object> row : userMapper.selectMaps(new QueryWrapper<User>().select("dept_id", "COUNT(*) AS cnt")
					.eq("user_type", "student").isNotNull("dept_id").groupBy("dept_id"))) {
				counts.merge(asString(row.get("dept_id")), asLong(row.get("cnt")), Long::sum);
			}
			return counts;
		}, Collections.emptyMap());

		Map<String, Long> extraMembers = safe("classes.extraMembers", () -> {
			Map<String, Long> counts = new HashMap<>();
			for (Map<String, Object> row : userDeptMapper.selectMaps(new QueryWrapper<UserDept>()
					.select("dept_id", "COUNT(*) AS cnt")

					.apply("user_id IN (SELECT id FROM t_user WHERE user_type = 'student' AND is_deleted = 0)")
					.groupBy("dept_id"))) {
				counts.merge(asString(row.get("dept_id")), asLong(row.get("cnt")), Long::sum);
			}
			return counts;
		}, Collections.emptyMap());
		long students = 0;
		long open = 0;
		Set<String> resourceClassIds = safe("classes.resources", () -> classResourceMapper
				.selectMaps(new QueryWrapper<ClassResource>().select("class_id").eq("resource_type", ClassResource.TYPE_PROJECT)
						.eq("status", 1).apply(PUBLISHED_RESOURCE_SQL).groupBy("class_id"))
				.stream().map(row -> asString(row.get("class_id"))).filter(StringUtils::hasText)
				.collect(Collectors.toCollection(LinkedHashSet::new)), Collections.<String>emptySet());
		for (String classId : classIds) {
			students += primaryMembers.getOrDefault(classId, 0L);
			boolean hasMember = primaryMembers.getOrDefault(classId, 0L) > 0
					|| extraMembers.getOrDefault(classId, 0L) > 0;
			if (teachingIds.contains(classId) && hasMember && resourceClassIds.contains(classId)) {
				open++;
			}
		}
		classes.setStudents(students);
		classes.setOpen(open);
		classes.setAvgSize(classIds.isEmpty() ? 0D : round1((double) students / classIds.size()));
	}

	/** 答卷：总数 / 今天 / 近 7 天 / 近 30 天 / 已批改 / 待批改 */
	private void fillAnswers(DashboardOverviewView.Answers answers) {
		answers.setTotal(safeCount("answers.total", () -> answerMapper.selectCount(formalAnswers())));
		answers.setToday(safeCount("answers.today",
				() -> answerMapper.selectCount(formalAnswers().ge("create_at", startOfToday()))));
		answers.setLast7d(safeCount("answers.last7d",
				() -> answerMapper.selectCount(formalAnswers().ge("create_at", daysAgo(RECENT_DAYS)))));
		answers.setLast30d(safeCount("answers.last30d",
				() -> answerMapper.selectCount(formalAnswers().ge("create_at", daysAgo(MONTH_DAYS)))));



		answers.setGraded(safeCount("answers.graded",
				() -> answerMapper.selectCount(formalAnswers().isNotNull("exam_score").ne("grade_status", GRADE_PENDING))));
		answers.setPending(safeCount("answers.pending",
				() -> answerMapper.selectCount(formalAnswers().eq("grade_status", GRADE_PENDING))));
	}

	/** 题库：t_repo / t_template 的逻辑未删除行数 */
	private void fillQuestions(DashboardOverviewView.Questions questions) {


		questions.setRepos(safeCount("questions.repos", () -> repoMapper.selectCount(null)));
		questions.setTemplates(safeCount("questions.templates", () -> templateMapper.selectCount(new QueryWrapper<Template>())));
	}

	/** 分数：一条聚合就够（COUNT / AVG / MAX / MIN + 及格数） */
	private void fillScores(DashboardOverviewView.Scores scores) {
		Map<String, Object> row = safe("scores", () -> {
			List<Map<String, Object>> rows = answerMapper.selectMaps(formalAnswers()
					.select("COUNT(*) AS cnt", "AVG(exam_score) AS avg_score", "MAX(exam_score) AS max_score",
							"MIN(exam_score) AS min_score",
							"SUM(CASE WHEN exam_score >= " + PASS_SCORE + " THEN 1 ELSE 0 END) AS passed")
					.isNotNull("exam_score"));
			return firstRow(rows);
		}, Collections.emptyMap());
		long scored = asLong(row.get("cnt"));
		scores.setScoredCount(scored);
		scores.setAvg(roundOrNull(asDouble(row.get("avg_score"))));
		scores.setMax(roundOrNull(asDouble(row.get("max_score"))));
		scores.setMin(roundOrNull(asDouble(row.get("min_score"))));
		scores.setPassRate(scored == 0 ? null : round1(asLong(row.get("passed")) * 100D / scored));
	}

	/** AI 用量：近 7 天的调用次数与 token（失败/被拦下的也计入，token 已经花掉了） */
	private void fillAi(DashboardOverviewView.Ai ai) {
		Map<String, Object> row = safe("ai", () -> firstRow(aiUsageMapper.selectMaps(new QueryWrapper<AiUsage>()
				.select("COUNT(*) AS cnt", "COALESCE(SUM(total_tokens), 0) AS tokens")
				.ge("create_at", daysAgo(RECENT_DAYS)))), Collections.emptyMap());
		ai.setCalls7d(asLong(row.get("cnt")));
		ai.setTokens7d(asLong(row.get("tokens")));
	}

	// ------ 趋势

	@Override
	public DashboardTrendView trend(int days) {
		return buildTrend(normalizeDays(days), formalAnswers(), "trend");
	}

	/** 当前老师可见范围内的趋势（老师首页用）：只统计 #teacher() 那批项目下的正式答卷 */
	@Override
	public DashboardTrendView teacherTrend(int days) {
		int window = normalizeDays(days);
		List<String> ids = visibleProjectIdsOfCurrentUser();
		if (ids.isEmpty()) {
			return buildTrend(window, null, "teacherTrend");
		}
		return buildTrend(window, formalAnswers().in("project_id", ids), "teacherTrend");
	}

	/** 当前登录人可见的、可作答的项目 id（老师首页与老师趋势的统一入口，避免两处各算一遍） */
	private List<String> visibleProjectIdsOfCurrentUser() {
		String userId = SecurityContextUtils.getUserId();
		List<String> classIds = visibleClassIds();
		Set<String> projectIds = safe("teacher.projectIds", () -> visibleProjectIds(userId, classIds),
				Collections.emptySet());
		return projectIdList(visibleProjectRows(projectIds));
	}

	/** 趋势骨架：一条 SQL 出四个序列，日期轴在 Java 里逐日补齐 */
	private DashboardTrendView buildTrend(int window, QueryWrapper<Answer> scope, String block) {
		DashboardTrendView view = new DashboardTrendView();
		LocalDate today = LocalDate.now();
		LocalDate from = today.minusDays(window - 1L);
		Date since = Date.from(from.atStartOfDay(ZoneId.systemDefault()).toInstant());

		Map<String, Map<String, Object>> byDay = new HashMap<>();
		if (scope != null) {
			List<Map<String, Object>> rows = safe(block, () -> answerMapper.selectMaps(scope
				.select("DATE(create_at) AS stat_day", "COUNT(*) AS cnt",

						"SUM(CASE WHEN exam_score IS NOT NULL AND (grade_status IS NULL OR grade_status <> '"
								+ GRADE_PENDING + "') THEN 1 ELSE 0 END) AS graded_cnt",
						"AVG(exam_score) AS avg_score", "COUNT(DISTINCT create_by) AS active_cnt")
				.ge("create_at", since).groupBy("DATE(create_at)")), Collections.emptyList());
			for (Map<String, Object> row : rows) {
				if (row == null) {
					continue;
				}
				String key = dayKey(row.get("stat_day"));
				if (key != null) {
					byDay.put(key, row);
				}
			}
		}
		for (LocalDate cursor = from; !cursor.isAfter(today); cursor = cursor.plusDays(1)) {
			Map<String, Object> row = byDay.get(cursor.toString());
			view.getDays().add(cursor.format(DAY_LABEL));
			if (row == null) {
				view.getAnswers().add(0L);
				view.getGraded().add(0L);

				view.getAvgScores().add(null);
				view.getActiveUsers().add(0L);
				continue;
			}
			view.getAnswers().add(asLong(row.get("cnt")));
			view.getGraded().add(asLong(row.get("graded_cnt")));
			view.getAvgScores().add(roundOrNull(asDouble(row.get("avg_score"))));
			view.getActiveUsers().add(asLong(row.get("active_cnt")));
		}
		return view;
	}



	/** 当前老师可见范围内的首页数字 */
	@Override
	public TeacherDashboardView teacher() {
		String userId = SecurityContextUtils.getUserId();
		TeacherDashboardView view = new TeacherDashboardView();
		List<String> classIds = visibleClassIds();
		view.setClasses(classIds.size());
		view.setStudents(classIds.isEmpty() ? 0L : safe("teacher.students", () -> countStudentsInClasses(classIds), 0L));
		Set<String> projectIds = safe("teacher.projectIds", () -> visibleProjectIds(userId, classIds), Collections.emptySet());

		List<Map<String, Object>> realProjects = visibleProjectRows(projectIds);
		List<String> ids = projectIdList(realProjects);
		view.setProjects(ids.size());
		view.setPublished(realProjects.stream()
				.filter(row -> Integer.valueOf(1).equals(asInteger(row.get("status")))).count());
		if (ids.isEmpty()) {
			return view;
		}
		Map<String, Object> stats = safe("teacher.answers", () -> firstRow(answerMapper.selectMaps(formalAnswers()
				.select("COUNT(*) AS cnt", "SUM(CASE WHEN grade_status = '" + GRADE_PENDING + "' THEN 1 ELSE 0 END) AS pending_cnt",
						"AVG(exam_score) AS avg_score")
				.in("project_id", ids))), Collections.emptyMap());
		view.setAnswers(asLong(stats.get("cnt")));
		view.setPendingGrading(asLong(stats.get("pending_cnt")));
		view.setAvgScore(roundOrNull(asDouble(stats.get("avg_score"))));
		view.setGraded7d(safeCount("teacher.graded7d", () -> answerMapper.selectCount(formalAnswers()
				.eq("grade_status", GRADE_GRADED).ge("graded_at", daysAgo(RECENT_DAYS)).in("project_id", ids))));
		view.setRecent(buildRecentProjects(realProjects, ids));
		return view;
	}

	/** 当前用户可见的班级 id（取树上 accessible=true 的节点，祖先占位节点不算） */
	private List<String> visibleClassIds() {
		return safe("teacher.classes", () -> {
			List<String> ids = new ArrayList<>();
			collectAccessible(classService.listClassTree(null), ids);
			return ids;
		}, new ArrayList<>());
	}

	private void collectAccessible(List<ClassNodeView> nodes, List<String> ids) {
		if (nodes == null || nodes.isEmpty()) {
			return;
		}
		for (ClassNodeView node : nodes) {
			if (node == null) {
				continue;
			}
			if (node.isAccessible() && StringUtils.hasText(node.getId())) {
				ids.add(node.getId());
			}
			collectAccessible(node.getChildren(), ids);
		}
	}

	/** 可见班级里的学员去重数：主班（t_user.dept_id）∪ 兼报班（t_user_dept） */
	private long countStudentsInClasses(List<String> classIds) {
		Set<String> ids = new LinkedHashSet<>();
		userMapper.selectObjs(new QueryWrapper<User>().select("id").eq("user_type", "student").in("dept_id", classIds))
				.stream().filter(Objects::nonNull).map(String::valueOf).forEach(ids::add);
		userDeptMapper
				.selectObjs(new QueryWrapper<UserDept>().select("DISTINCT user_id").in("dept_id", classIds)

						.apply("user_id IN (SELECT id FROM t_user WHERE user_type = 'student' AND is_deleted = 0)"))
				.stream().filter(Objects::nonNull).map(String::valueOf).forEach(ids::add);
		return ids.size();
	}

	/** 可见项目 id：自己建的 + 所有者/协作者（含按组授权）+ 可见班级上分配过的资源 */
	private Set<String> visibleProjectIds(String userId, List<String> classIds) {
		Set<String> ids = new LinkedHashSet<>();
		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			return ids;
		}
		projectMapper.selectObjs(new QueryWrapper<Project>().select("id").eq("create_by", userId)).stream()
				.filter(Objects::nonNull).map(String::valueOf).forEach(ids::add);
		Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		QueryWrapper<ProjectPartner> partnerQuery = new QueryWrapper<ProjectPartner>().select("project_id")
				.in("type", ProjectPartnerTypeEnum.OWNER.getType(), ProjectPartnerTypeEnum.COLLABORATOR.getType());
		if (deptScope == null || deptScope.isEmpty()) {
			partnerQuery.eq("user_id", userId);
		}
		else {

			partnerQuery.and(wrapper -> wrapper.eq("user_id", userId).or().in("group_id", deptScope));
		}
		projectPartnerMapper.selectObjs(partnerQuery).stream().filter(Objects::nonNull).map(String::valueOf)
				.forEach(ids::add);
		if (!classIds.isEmpty()) {
			classResourceMapper
					.selectObjs(new QueryWrapper<ClassResource>().select("resource_id")
							.eq("resource_type", ClassResource.TYPE_PROJECT).in("class_id", classIds))
					.stream().filter(Objects::nonNull).map(String::valueOf).forEach(ids::add);
		}
		return ids;
	}

	/** 老师可见的、可作答的项目行（id / name / mode / status / create_at） */
	private List<Map<String, Object>> visibleProjectRows(Set<String> projectIds) {
		if (projectIds == null || projectIds.isEmpty()) {
			return new ArrayList<>();
		}
		return safe("teacher.projects", () -> projectMapper
				.selectMaps(new QueryWrapper<Project>().select("id", "name", "mode", "status", "create_at")
					.in("id", projectIds)),
				Collections.<Map<String, Object>>emptyList())
				.stream()
				.filter(row -> row != null
					&& !ProjectModeEnum.folder.name().equalsIgnoreCase(asString(row.get("mode"))))
				.collect(Collectors.toList());
	}

	/** 项目行 → id 列表（保序、跳过空 id；老师统计与老师趋势都按这批 id 过滤） */
	private static List<String> projectIdList(List<Map<String, Object>> rows) {
		return rows.stream().map(row -> asString(row.get("id"))).filter(StringUtils::hasText)
				.collect(Collectors.toList());
	}

	/** 最近有动静的 8 个项目：一条 group by project_id 拿齐答卷数/平均分/待批改/最后交卷时间， 再按「最后交卷时间倒序、没交过的按建卷时间倒序」排序 */
	private List<TeacherDashboardView.Recent> buildRecentProjects(List<Map<String, Object>> projectRows, List<String> ids) {
		Map<String, Map<String, Object>> statsByProject = new HashMap<>();
		for (Map<String, Object> row : safe("teacher.recent", () -> answerMapper
				.selectMaps(formalAnswers().select("project_id", "COUNT(*) AS cnt", "AVG(exam_score) AS avg_score",
						"SUM(CASE WHEN grade_status = '" + GRADE_PENDING + "' THEN 1 ELSE 0 END) AS pending_cnt",
						"MAX(create_at) AS last_at")
						.in("project_id", ids).groupBy("project_id")),
				Collections.<Map<String, Object>>emptyList())) {
			if (row != null) {
				statsByProject.put(asString(row.get("project_id")), row);
			}
		}
		List<TeacherDashboardView.Recent> recent = new ArrayList<>();
		List<ProjectBrief> briefs = new ArrayList<>();
		for (Map<String, Object> row : projectRows) {
			ProjectBrief brief = new ProjectBrief();
			brief.id = asString(row.get("id"));
			brief.name = asString(row.get("name"));
			brief.status = asInteger(row.get("status"));
			brief.createAt = toDate(row.get("create_at"));
			Map<String, Object> stat = statsByProject.get(brief.id);
			if (stat != null) {
				brief.answerCount = asLong(stat.get("cnt"));
				brief.avgScore = roundOrNull(asDouble(stat.get("avg_score")));
				brief.pendingGrading = asLong(stat.get("pending_cnt"));
				brief.lastAnswerAt = toDate(stat.get("last_at"));
			}
			briefs.add(brief);
		}
		briefs.sort(Comparator
				.comparing((ProjectBrief brief) -> brief.lastAnswerAt,
						Comparator.nullsLast(Comparator.<Date>reverseOrder()))
				.thenComparing(brief -> brief.createAt, Comparator.nullsLast(Comparator.<Date>reverseOrder())));
		for (ProjectBrief brief : briefs.stream().limit(RECENT_PROJECT_LIMIT).collect(Collectors.toList())) {
			TeacherDashboardView.Recent item = new TeacherDashboardView.Recent();
			item.setProjectId(brief.id);
			item.setProjectName(brief.name);
			item.setStatus(brief.status);
			item.setAnswerCount(brief.answerCount);
			item.setAvgScore(brief.avgScore);
			item.setPendingGrading(brief.pendingGrading);
			item.setLastAnswerAt(brief.lastAnswerAt);
			recent.add(item);
		}
		return recent;
	}

	// ------ 学员视角

	@Override
	public StudentDashboardView student() {
		String userId = SecurityContextUtils.getUserId();
		StudentDashboardView view = new StudentDashboardView();

		if (!StringUtils.hasText(userId) || AppConsts.ANONYMOUS_USER_ID.equals(userId)) {
			return view;
		}
		User me = safe("student.me", () -> userMapper.selectById(userId), null);
		List<String> classIds = safe("student.classes", () -> myClassIds(userId, me), new ArrayList<>());
		view.setClasses(classIds.size());
		view.setAnswers(safeCount("student.answers", () -> answerMapper.selectCount(formalAnswers().eq("create_by", userId))));
		Map<String, Object> scoreRow = safe("student.scores", () -> firstRow(answerMapper.selectMaps(formalAnswers()
				.eq("create_by", userId)
				.select("COUNT(*) AS cnt", "AVG(exam_score) AS avg_score", "MAX(exam_score) AS max_score")
				.isNotNull("exam_score"))), Collections.emptyMap());
		view.setAvgScore(roundOrNull(asDouble(scoreRow.get("avg_score"))));
		view.setBestScore(roundOrNull(asDouble(scoreRow.get("max_score"))));
		view.setPracticeCount(safeCount("student.practice", () -> answerMapper.selectCount(practiceAnswers(userId))));
		view.setPracticeQuestions(
				safeCount("student.practiceQuestions", () -> countPracticeQuestions(userId)));
		view.setTodoExams(classIds.isEmpty() ? 0L : safe("student.todo", () -> countTodoExams(userId, classIds), 0L));
		view.setRecent(safe("student.recent", () -> recentAnswers(userId), new ArrayList<>()));
		return view;
	}

	/** 我所属的班级：主班在前，兼报班在后（去重） */
	private List<String> myClassIds(String userId, User me) {
		Set<String> ids = new LinkedHashSet<>();
		if (me != null && StringUtils.hasText(me.getDeptId())) {
			ids.add(me.getDeptId());
		}
		userDeptMapper.selectObjs(new QueryWrapper<UserDept>().select("dept_id").eq("user_id", userId)).stream()
				.filter(Objects::nonNull).map(String::valueOf).filter(StringUtils::hasText).forEach(ids::add);
		return new ArrayList<>(ids);
	}

	/** 练习记录：与「我的练习记录」列表（ExerciseAnswerService#historyExercise）同一口径 —— 有 exam_exercise_type 的行，且「真的动过」（已交卷或暂存里有内容） */
	private QueryWrapper<Answer> practiceAnswers(String userId) {
		return new QueryWrapper<Answer>().eq("create_by", userId).isNotNull("exam_exercise_type")
				.and(wrapper -> wrapper.eq("temp_save", FORMAL).or().isNotNull("temp_answer").ne("temp_answer", ""));
	}

	/** 练习过的题目数：去重题数，来自 t_answer_item 投影（交卷时把 answer JSON 展开成一题一行） */
	private long countPracticeQuestions(String userId) {
		List<Map<String, Object>> rows = answerItemMapper.selectMaps(new QueryWrapper<AnswerItem>()
				.select("COUNT(DISTINCT question_id) AS cnt")
				.apply("answer_id IN (SELECT id FROM t_answer WHERE create_by = {0} AND project_id = '"
						+ EXERCISE_PROJECT_ID + "' AND is_deleted = 0)", userId));
		return asLong(firstRow(rows).get("cnt"));
	}

	/** 待参加的考试：分配到我所在班级、已发布、当前在开放时间内、我还没交过 */
	private long countTodoExams(String userId, List<String> classIds) {
		Map<String, List<Map<String, Object>>> windowsByProject = new LinkedHashMap<>();
		for (Map<String, Object> row : classResourceMapper.selectMaps(new QueryWrapper<ClassResource>()
				.select("resource_id", "start_at", "end_at").eq("resource_type", ClassResource.TYPE_PROJECT)
				.eq("status", 1).in("class_id", classIds))) {
			String projectId = asString(row.get("resource_id"));
			if (StringUtils.hasText(projectId)) {
				windowsByProject.computeIfAbsent(projectId, key -> new ArrayList<>()).add(row);
			}
		}
		if (windowsByProject.isEmpty()) {
			return 0;
		}
		List<String> candidates = new ArrayList<>();
		long now = System.currentTimeMillis();
		for (Map<String, Object> row : projectMapper.selectMaps(new QueryWrapper<Project>()
				.select("id", "setting").eq("mode", ProjectModeEnum.exam.name()).eq("status", 1)
				.in("id", windowsByProject.keySet()))) {
			String projectId = asString(row.get("id"));
			Long[] global = examWindow(asString(row.get("setting")));
			for (Map<String, Object> window : windowsByProject.getOrDefault(projectId, Collections.emptyList())) {
				Long start = toMillis(window.get("start_at"));
				Long end = toMillis(window.get("end_at"));
				if (isOpen(start == null ? global[0] : start, end == null ? global[1] : end, now)) {
					candidates.add(projectId);
					break;
				}
			}
		}
		if (candidates.isEmpty()) {
			return 0;
		}

		Set<String> submitted = answerMapper
				.selectObjs(new QueryWrapper<Answer>().select("DISTINCT project_id").eq("create_by", userId)
						.eq("temp_save", FORMAL).in("project_id", candidates))
				.stream().filter(Objects::nonNull).map(String::valueOf).collect(Collectors.toSet());
		return candidates.stream().filter(id -> !submitted.contains(id)).count();
	}

	/** 最近 20 次正式答卷（含分数），项目名一次批量取回，不逐个查 */
	private List<StudentDashboardView.Recent> recentAnswers(String userId) {
		List<Map<String, Object>> rows = answerMapper.selectMaps(formalAnswers().eq("create_by", userId)
				.select("project_id", "exam_score", "create_at").orderByDesc("create_at")
				.last("LIMIT " + RECENT_ANSWER_LIMIT));
		List<String> projectIds = rows.stream().map(row -> asString(row.get("project_id"))).filter(StringUtils::hasText)
				.distinct().collect(Collectors.toList());
		Map<String, String> names = new HashMap<>();
		if (!projectIds.isEmpty()) {
			for (Map<String, Object> row : projectMapper.selectMaps(
					new QueryWrapper<Project>().select("id", "name").in("id", projectIds))) {
				names.put(asString(row.get("id")), asString(row.get("name")));
			}
		}
		List<StudentDashboardView.Recent> recent = new ArrayList<>();
		for (Map<String, Object> row : rows) {
			StudentDashboardView.Recent item = new StudentDashboardView.Recent();
			item.setProjectId(asString(row.get("project_id")));
			item.setProjectName(names.get(item.getProjectId()));
			item.setExamScore(roundOrNull(asDouble(row.get("exam_score"))));
			item.setCreateAt(toDate(row.get("create_at")));
			recent.add(item);
		}
		return recent;
	}



	/** 单个子统计的失败兜底：任何 RuntimeException 都只让这一块变成默认值，其余块照常返回 */
	private <T> T safe(String block, Supplier<T> supplier, T fallback) {
		try {
			T value = supplier.get();
			return value == null ? fallback : value;
		}
		catch (RuntimeException e) {
			log.warn("首页统计子查询失败，按默认值兜底: block={}", block, e);
			return fallback;
		}
	}

	private long safeCount(String block, Supplier<Long> supplier) {
		Long value = safe(block, supplier, 0L);
		return value == null ? 0L : value;
	}

	/** 正式交卷的公共条件：temp_save=1 且不是练习记录（练习的 project_id 是伪项目 exercise） */
	private QueryWrapper<Answer> formalAnswers() {
		return new QueryWrapper<Answer>().eq("temp_save", FORMAL).ne("project_id", EXERCISE_PROJECT_ID);
	}

	private static Map<String, Object> firstRow(List<Map<String, Object>> rows) {
		if (rows == null || rows.isEmpty() || rows.get(0) == null) {
			return Collections.emptyMap();
		}
		return rows.get(0);
	}

	/** 窗口天数：小于 1 按默认 14，超过上限按 90（前端传 365 也不会把响应撑爆） */
	private static int normalizeDays(int days) {
		if (days < 1) {
			return DEFAULT_DAYS;
		}
		return Math.min(days, MAX_DAYS);
	}

	private static Date daysAgo(int days) {
		return new Date(System.currentTimeMillis() - days * 24L * 3600L * 1000L);
	}

	private static Date startOfToday() {
		return Date.from(LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant());
	}

	/** 考试时间窗是否包含此刻；两端为空表示不限 */
	private static boolean isOpen(Long start, Long end, long now) {
		return (start == null || now >= start) && (end == null || now <= end);
	}

	/** 解析 setting JSON 里的 examSetting.startTime/endTime（epoch 毫秒）；解析不了按「不限时间」 */
	private Long[] examWindow(String settingJson) {
		Long[] window = new Long[] { null, null };
		if (!StringUtils.hasText(settingJson)) {
			return window;
		}
		try {
			JsonNode root = objectMapper.readTree(settingJson);
			JsonNode examSetting = root == null ? null : root.get("examSetting");
			if (examSetting == null || examSetting.isNull()) {
				return window;
			}
			window[0] = epochMillis(examSetting.get("startTime"));
			window[1] = epochMillis(examSetting.get("endTime"));
		}
		catch (RuntimeException e) {

			log.warn("解析项目设置的考试时间窗失败，按不限时间处理", e);
		}
		return window;
	}

	private static Long epochMillis(JsonNode node) {
		return node == null || node.isNull() || !node.isNumber() ? null : node.asLong();
	}

	private static long asLong(Object value) {
		if (value == null) {
			return 0L;
		}
		if (value instanceof Number number) {
			return number.longValue();
		}
		if (value instanceof Boolean flag) {
			return flag ? 1L : 0L;
		}
		try {
			return Long.parseLong(String.valueOf(value).trim());
		}
		catch (NumberFormatException e) {
			return 0L;
		}
	}

	private static Integer asInteger(Object value) {
		if (value == null) {
			return null;
		}
		if (value instanceof Number number) {
			return number.intValue();
		}
		try {
			return Integer.valueOf(String.valueOf(value).trim());
		}
		catch (NumberFormatException e) {
			return null;
		}
	}

	private static Double asDouble(Object value) {
		if (value == null) {
			return null;
		}
		if (value instanceof Number number) {
			return number.doubleValue();
		}
		try {
			return Double.valueOf(String.valueOf(value).trim());
		}
		catch (NumberFormatException e) {
			return null;
		}
	}

	private static String asString(Object value) {
		return value == null ? null : String.valueOf(value);
	}

	/** DATE(create_at) 的取值归一成 yyyy-MM-dd：驱动可能给 java.sql.Date / LocalDate / Timestamp / 字符串 */
	private static String dayKey(Object value) {
		if (value == null) {
			return null;
		}
		String text = String.valueOf(value).trim();
		return text.length() < 10 ? null : text.substring(0, 10);
	}

	/** 库里的时间字段归一成 Date：驱动可能给 Timestamp / LocalDateTime / 字符串 */
	private static Date toDate(Object value) {
		if (value == null) {
			return null;
		}
		if (value instanceof Date date) {
			return date;
		}
		if (value instanceof java.time.LocalDateTime dateTime) {
			return Date.from(dateTime.atZone(ZoneId.systemDefault()).toInstant());
		}
		if (value instanceof java.time.LocalDate date) {
			return Date.from(date.atStartOfDay(ZoneId.systemDefault()).toInstant());
		}
		if (value instanceof java.time.Instant instant) {
			return Date.from(instant);
		}
		if (value instanceof Number number) {
			return new Date(number.longValue());
		}
		return null;
	}

	private static Long toMillis(Object value) {
		Date date = toDate(value);
		return date == null ? null : date.getTime();
	}

	private static Double roundOrNull(Double value) {
		return value == null ? null : round1(value);
	}

	/** 保留 1 位小数：首页显示用，避免 73.33333333 这种数字 */
	private static double round1(double value) {
		return Math.round(value * 10D) / 10D;
	}


	private static final class ProjectBrief {

		private String id;

		private String name;

		private Integer status;

		private Date createAt;

		private long answerCount;

		private Double avgScore;

		private long pendingGrading;

		private Date lastAnswerAt;

	}

}
