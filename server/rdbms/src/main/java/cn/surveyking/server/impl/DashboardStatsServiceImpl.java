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

/**
 * 首页统计实现（task-34）。
 *
 * <p><b>为什么单独一个服务</b>：老 {@code DashboardServiceImpl} 是「项目里内嵌的仪表盘组件」，
 * 只有 /api/dashboard/list 一条列表查询；首页看板要的是跨表的聚合数字，两件事的数据源、
 * 性能预算、失败兜底都不一样，所以不往老服务里加方法。
 *
 * <p><b>实现纪律</b>（与需求口径一一对应）：
 * <ul>
 * <li>只统计未删除数据：实体上的 {@code @TableLogic} 会自动补 {@code is_deleted = 0}；
 * 少数没有这一列的表（t_user_role / t_project_partner / t_answer_item / t_ai_usage）
 * 本来就没有逻辑删除，也不硬加条件；</li>
 * <li>一律 {@code selectCount} / {@code selectMaps} 走 SQL 聚合，不把答卷明细拉进内存做循环；
 * 跨表地方用「一次查询 + 内存拼装」或者 EXISTS 子查询，不做 N+1；</li>
 * <li>每个子统计单独 try/catch（{@link #safe}）：某个口径算不出来就退化成 0 或 null 并记 warn，
 * 首页不会因为一个统计 500；</li>
 * <li>答卷口径统一 {@link #FORMAL}（temp_save=1）并排除练习伪项目（见 {@link #EXERCISE_PROJECT_ID}）。</li>
 * </ul>
 *
 * <p><b>两处「没有现成字段」的口径，选择与理由写在这里</b>：
 * <ol>
 * <li>「进行中的考试」：t_project <b>没有</b> start_time / end_time 列，开放时间是
 * {@code t_project.setting} JSON 里的 {@code examSetting.startTime/endTime}（epoch 毫秒）。
 * 所以 running 只能把「已发布的考试」的 setting 取回来解析时间窗再判断；解析失败的
 * 项目按「不限时间」处理（宁可多算一个进行中，也不因为一条脏 JSON 让首页少算一片）；</li>
 * <li>「开班中」：t_dept 没有班级状态字段（只有 dept_type 与 class_kind 两个维度，开班/结班是
 * 业务动作）。这里按需求给的近似口径：教学班（class_kind≠group）+ 有在册学员 + 至少分配了一个
 * 「已发布」考试/问卷的班级资源。三个条件都能在库里直接观测到，不依赖人工维护的状态位。</li>
 * </ol>
 *
 * @author be-stats
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardStatsServiceImpl implements DashboardStatsService {

	/** 趋势窗口默认天数 */
	private static final int DEFAULT_DAYS = 14;

	/** 趋势窗口上限：再多首页也画不下，且逐日补空后响应体线性变大 */
	private static final int MAX_DAYS = 90;

	/** 「近 7 天」窗口：滚动 7×24 小时（不是 7 个自然日，自然日只在趋势图里用） */
	private static final int RECENT_DAYS = 7;

	/** 「近 30 天」窗口：同上，滚动 30×24 小时 */
	private static final int MONTH_DAYS = 30;

	/** 正式交卷：t_answer.temp_save=1（0 是未提交草稿） */
	private static final int FORMAL = 1;

	/** 批改状态：主观题都批完了 */
	private static final String GRADE_GRADED = "graded";

	/** 批改状态：还有主观题等老师批 */
	private static final String GRADE_PENDING = "pending";

	/** 及格线（分）：系统级面板跨卷统计，无法逐卷还原满分，按绝对 60 分判及格 */
	private static final int PASS_SCORE = 60;

	/** 练习记录写在 t_answer 里的伪项目 id（没有 t_project 行） */
	private static final String EXERCISE_PROJECT_ID = ExerciseProjectTemplate.EXERCISE_PROJECT_ID;

	/** 老师首页「最近项目」条数 */
	private static final int RECENT_PROJECT_LIMIT = 8;

	/** 学员首页「最近答卷」条数 */
	private static final int RECENT_ANSWER_LIMIT = 8;

	/**
	 * 管理员判定（SQL 片段，作用于外层的 t_user 行）。
	 *
	 * <p>口径与 {@code SecurityContextUtils.isAdmin()} 对齐：那里判断的是权限集合里有没有
	 * {@code ROLE_admin}，而 {@code ROLE_admin} 来自角色 code='admin'。所以这里认两种情况：
	 * 直挂 admin 角色（t_user_role → t_role.code='admin'），或登录账号就是 admin（种子账号）。
	 *
	 * <p>两个已知边界，都写在返回说明里：
	 * <ul>
	 * <li>通过用户组绑定的 admin 角色（t_dept_role + 祖先链）<b>不</b>计入管理员数：那要按
	 * {@code UserDeptScopeService} 的递归组链逐人展开，首页不值得为一个几乎不用的配置付这个代价，
	 * 这类账号会落在「老师」里；</li>
	 * <li>t_user_role 没有 is_deleted 列，所以只对 t_role / t_account 加逻辑删除条件。</li>
	 * </ul>
	 */
	private static final String ADMIN_USER_SQL = "EXISTS (SELECT 1 FROM t_user_role ur JOIN t_role r ON r.id = ur.role_id "
			+ "WHERE ur.user_id = t_user.id AND r.code = 'admin' AND r.is_deleted = 0) "
			+ "OR EXISTS (SELECT 1 FROM t_account a WHERE a.user_id = t_user.id "
			+ "AND a.auth_account = 'admin' AND a.is_deleted = 0)";

	/**
	 * 班级资源里「这个资源是已发布项目」的条件（一个 EXISTS，避免把 t_project 全表拉回来再比对）。
	 *
	 * <p>t_class_resource 的 resource_type 除了 project 还有 repo，repo 行的 resource_id 指向
	 * t_repo，天然不会命中这里。
	 */
	private static final String PUBLISHED_RESOURCE_SQL = "EXISTS (SELECT 1 FROM t_project p "
			+ "WHERE p.id = t_class_resource.resource_id AND p.is_deleted = 0 AND p.status = 1)";

	/** 趋势图日期轴格式：11-04 */
	private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MM-dd");

	// ------ 依赖（顺序即构造参数顺序，单测按这个顺序 new）

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

	/** 组链可见范围（协作者按用户组授权时用） */
	private final UserDeptScopeService userDeptScopeService;

	/** 班级可见性只认 ClassService 那一套，不在这里重写 */
	private final ClassService classService;

	/** 只用来解析 project.setting 里的考试时间窗 */
	private final ObjectMapper objectMapper;

	// ------ 总览

	@Override
	public DashboardOverviewView overview(int days) {
		// days 只做夹取，不参与总览口径：总览的窗口是固定的（今天 / 7 天 / 30 天）。
		// 保留这个参数是为了前端四个首页接口能用同一套调用签名。
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

	/**
	 * 人：学员 / 老师 / 管理员互斥，合计就是三者之和。
	 *
	 * <p>先认管理员再认 user_type：管理员账号的 user_type 也是 staff，不先扣掉就会被数两次
	 * （「老师 5 人 + 管理员 1 人 = 6」但系统里只有 5 个 staff）。
	 */
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
		// 活跃人数按「人」去重：同一个人交 10 份卷只算 1 个活跃用户；
		// 匿名答卷没有 create_by（COUNT DISTINCT 天然忽略 NULL），教职工答卷也算活跃。
		users.setActive7d(safeCount("users.active7d", () -> {
			List<Map<String, Object>> rows = answerMapper.selectMaps(formalAnswers()
					.select("COUNT(DISTINCT create_by) AS cnt").isNotNull("create_by").ge("create_at", daysAgo(RECENT_DAYS)));
			return asLong(firstRow(rows).get("cnt"));
		}));
	}

	/**
	 * 项目：一次 group by (mode, status) 拿到全部计数，再单独解析「进行中」。
	 *
	 * <p>不把 t_project 整表拉回来：survey / setting 都是 longtext，一堂考试几 KB，
	 * 几百个项目就是几 MB，首页扛不住。只有「已发布的考试」才需要 setting，用来解析时间窗。
	 */
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

	/**
	 * 进行中的考试：mode=exam + status=1 + 当前落在 [startTime, endTime] 内（两端为空表示不限）。
	 *
	 * <p>时间窗来自 setting JSON（t_project 没有独立的时间列），所以这条只能把已发布考试的
	 * id + setting 取回来在 Java 里判断 —— 这是本类唯一会读 setting 的地方，行数受「已发布考试」
	 * 限制，不会随历史数据增长。
	 */
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

	/**
	 * 班级：总数 / 开班中 / 在册学员 / 平均班额。
	 *
	 * <p>「开班中」的三个条件（缺一个都不算）：
	 * <ol>
	 * <li>教学班：class_kind ≠ group（历史数据 class_kind 为空按容器班处理，与
	 * {@code ClassServiceImpl#classKindOf} 一致）；</li>
	 * <li>有在册学员：主班（t_user.dept_id）或兼报班（t_user_dept）里有人；</li>
	 * <li>有已发布项目资源：t_class_resource 里 status=1 且指向已发布考试/问卷。</li>
	 * </ol>
	 * 「在册学员」按主班去重：一个学员只有一个主班，兼报班不重复计人，所以总数不会大于学员总数。
	 */
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
		// 主班人数：t_user.dept_id 是主组，学员一定有一个主班
		Map<String, Long> primaryMembers = safe("classes.members", () -> {
			Map<String, Long> counts = new HashMap<>();
			for (Map<String, Object> row : userMapper.selectMaps(new QueryWrapper<User>().select("dept_id", "COUNT(*) AS cnt")
					.eq("user_type", "student").isNotNull("dept_id").groupBy("dept_id"))) {
				counts.merge(asString(row.get("dept_id")), asLong(row.get("cnt")), Long::sum);
			}
			return counts;
		}, Collections.emptyMap());
		// 兼报班人数：只用来判「这个班有没有人」，不参与 students（否则一个人会被数两次）
		Map<String, Long> extraMembers = safe("classes.extraMembers", () -> {
			Map<String, Long> counts = new HashMap<>();
			for (Map<String, Object> row : userDeptMapper.selectMaps(new QueryWrapper<UserDept>()
					.select("dept_id", "COUNT(*) AS cnt")
					// 兼报表里也可能绑着老师；「在册学员」只认学员
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
		// 已批改 = 有分数且不在「待批改」里。
		// 只认 grade_status='graded' 会把两类答卷漏掉：迁移后默认值 'none'（纯客观题，系统自动判分、无需人工批改）
		// 与 2.2.1 之前的老数据（grade_status 为空但有分）。漏掉的后果是首页批改进度恒为 0%。
		answers.setGraded(safeCount("answers.graded",
				() -> answerMapper.selectCount(formalAnswers().isNotNull("exam_score").ne("grade_status", GRADE_PENDING))));
		answers.setPending(safeCount("answers.pending",
				() -> answerMapper.selectCount(formalAnswers().eq("grade_status", GRADE_PENDING))));
	}

	/**
	 * 题库：t_repo / t_template 的逻辑未删除行数。
	 *
	 * <p>t_template 走 @TableLogic 自动补 is_deleted=0；<b>t_repo 必须手写</b>：{@code Repo} 实体把
	 * {@code deleted} 重新声明成了 {@code @TableField(exist = false)}（为了不让它出现在 JSON 里），
	 * MyBatis-Plus 因此认为这张表没有逻辑删除列，不会自动补条件（实测 Repo 的
	 * {@code TableInfo.isWithLogicDelete()=false}，User/Dept/Project/Answer/ClassResource 都是 true）。
	 */
	private void fillQuestions(DashboardOverviewView.Questions questions) {
		questions.setRepos(safeCount("questions.repos",
				() -> repoMapper.selectCount(new QueryWrapper<Repo>().eq("is_deleted", 0))));
		questions.setTemplates(safeCount("questions.templates", () -> templateMapper.selectCount(new QueryWrapper<Template>())));
	}

	/**
	 * 分数：一条聚合就够（COUNT / AVG / MAX / MIN + 及格数）。
	 *
	 * <p>只看有分数的正式答卷：问卷的 exam_score 是空的，算进分母会把平均分拉低。
	 * 没有样本时四个值都给 null（而不是 0），前端显示「—」即可。
	 */
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
		int window = normalizeDays(days);
		DashboardTrendView view = new DashboardTrendView();
		LocalDate today = LocalDate.now();
		LocalDate from = today.minusDays(window - 1L);
		Date since = Date.from(from.atStartOfDay(ZoneId.systemDefault()).toInstant());
		// 一条 SQL 出四个序列：按自然日分组，缺的日期下面在 Java 里补 0 / null。
		// 不逐日循环查 14 次，也不把答卷拉进内存按日期桶排。
		Map<String, Map<String, Object>> byDay = new HashMap<>();
		List<Map<String, Object>> rows = safe("trend", () -> answerMapper.selectMaps(formalAnswers()
				.select("DATE(create_at) AS stat_day", "COUNT(*) AS cnt",
						// 与 overview 的 graded 同一口径：有分数且不是待批改（含 none / 空 / graded）
				"SUM(CASE WHEN exam_score IS NOT NULL AND (grade_status IS NULL OR grade_status <> '" + GRADE_PENDING
						+ "') THEN 1 ELSE 0 END) AS graded_cnt",
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
		for (LocalDate cursor = from; !cursor.isAfter(today); cursor = cursor.plusDays(1)) {
			Map<String, Object> row = byDay.get(cursor.toString());
			view.getDays().add(cursor.format(DAY_LABEL));
			if (row == null) {
				view.getAnswers().add(0L);
				view.getGraded().add(0L);
				// 当天没有带分数的答卷：null 而不是 0，折线在那里断开
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

	// ------ 老师视角

	/**
	 * 当前老师可见范围内的首页数字。
	 *
	 * <p>班级可见性直接复用 {@code ClassService.listClassTree}：班主任是自己创建/负责的班，
	 * 被授权老师是 t_class_partner 里的班（含下级班），管理员 / class:grant 是全部 —— 与班级管理页
	 * 看到的完全一致，不在首页另写一套判定。
	 *
	 * <p>项目可见性 = 自己创建 ∪ 所有者/协作者（t_project_partner，含按用户组授权）∪
	 * 可见班级上分配过的资源。前两条与 {@code AnswerAccessGuard#canManageProject} 同源，
	 * 第三条覆盖「资源分配给班级」这一层：老师没被加成协作者，但班是他带的。
	 */
	@Override
	public TeacherDashboardView teacher() {
		String userId = SecurityContextUtils.getUserId();
		TeacherDashboardView view = new TeacherDashboardView();
		List<String> classIds = visibleClassIds();
		view.setClasses(classIds.size());
		view.setStudents(classIds.isEmpty() ? 0L : safe("teacher.students", () -> countStudentsInClasses(classIds), 0L));
		Set<String> projectIds = safe("teacher.projectIds", () -> visibleProjectIds(userId, classIds), Collections.emptySet());
		if (projectIds.isEmpty()) {
			return view;
		}
		List<Map<String, Object>> projectRows = safe("teacher.projects", () -> projectMapper
				.selectMaps(new QueryWrapper<Project>().select("id", "name", "mode", "status", "create_at").in("id", projectIds)),
				Collections.emptyList());
		// 文件夹不是可作答的项目：不参与 projects / published，也不出现在 recent 里
		List<Map<String, Object>> realProjects = projectRows.stream()
				.filter(row -> !ProjectModeEnum.folder.name().equalsIgnoreCase(asString(row.get("mode"))))
				.collect(Collectors.toList());
		List<String> ids = realProjects.stream().map(row -> asString(row.get("id"))).filter(StringUtils::hasText)
				.collect(Collectors.toList());
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

	/**
	 * 可见班级里的学员去重数：主班（t_user.dept_id）∪ 兼报班（t_user_dept）。
	 *
	 * <p>不能直接把每个班的 memberCount 加起来：兼报班学员会被数两次。所以取 id 再求并集，
	 * 学员量级是「几个班 × 几十人」，只取 id 一列，代价可控。
	 */
	private long countStudentsInClasses(List<String> classIds) {
		Set<String> ids = new LinkedHashSet<>();
		userMapper.selectObjs(new QueryWrapper<User>().select("id").eq("user_type", "student").in("dept_id", classIds))
				.stream().filter(Objects::nonNull).map(String::valueOf).forEach(ids::add);
		userDeptMapper
				.selectObjs(new QueryWrapper<UserDept>().select("DISTINCT user_id").in("dept_id", classIds)
						// 兼报表里也会绑老师，学员去重只认 student
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
			// 按用户组授权：自己直挂，或者授权在他所在的任一组（组链已在 scope 里展开）
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

	/**
	 * 最近有动静的 8 个项目：一条 group by project_id 拿齐答卷数/平均分/待批改/最后交卷时间，
	 * 再按「最后交卷时间倒序、没交过的按建卷时间倒序」排序。
	 */
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
		// 匿名/无上下文：全 0 返回，不查库（首页对匿名用户不开放，但接口不该 500）
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

	/**
	 * 练习记录：与「我的练习记录」列表（{@code ExerciseAnswerService#historyExercise}）同一口径 ——
	 * 有 exam_exercise_type 的行，且「真的动过」（已交卷或暂存里有内容）。
	 *
	 * <p>只点开「开始练习」会建一条空 record，不滤掉的话练习次数会被点开次数刷高。
	 */
	private QueryWrapper<Answer> practiceAnswers(String userId) {
		return new QueryWrapper<Answer>().eq("create_by", userId).isNotNull("exam_exercise_type")
				.and(wrapper -> wrapper.eq("temp_save", FORMAL).or().isNotNull("temp_answer").ne("temp_answer", ""));
	}

	/**
	 * 练习过的题目数：去重题数，来自 t_answer_item 投影（交卷时把 answer JSON 展开成一题一行）。
	 *
	 * <p>用 EXISTS 式子查询按 create_by 反查，不把练习记录 id 全捞出来再 IN：练习次数可以很多，
	 * id 列表会越滚越长。投影没同步到的历史练习不计入（偏小），也不会因此报错。
	 */
	private long countPracticeQuestions(String userId) {
		List<Map<String, Object>> rows = answerItemMapper.selectMaps(new QueryWrapper<AnswerItem>()
				.select("COUNT(DISTINCT question_id) AS cnt")
				.apply("answer_id IN (SELECT id FROM t_answer WHERE create_by = {0} AND project_id = '"
						+ EXERCISE_PROJECT_ID + "' AND is_deleted = 0)", userId));
		return asLong(firstRow(rows).get("cnt"));
	}

	/**
	 * 待参加的考试：分配到我所在班级、已发布、当前在开放时间内、我还没交过。
	 *
	 * <p>「开放时间」与 {@code ClassResourceService} 完全一致：班级窗口为空表示继承项目的全局窗口
	 * （examSetting.startTime/endTime），班级窗口非空时以它为准（全局是硬上限，分配时就校验过）。
	 * 一个班关闭不代表别的班也关闭：同一场考试可能在多个班上有不同窗口，任一窗口开放即可参加。
	 */
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
		// 已经交过的（正式答卷）从待考里去掉：temp_save=0 的草稿不算交卷
		Set<String> submitted = answerMapper
				.selectObjs(new QueryWrapper<Answer>().select("DISTINCT project_id").eq("create_by", userId)
						.eq("temp_save", FORMAL).in("project_id", candidates))
				.stream().filter(Objects::nonNull).map(String::valueOf).collect(Collectors.toSet());
		return candidates.stream().filter(id -> !submitted.contains(id)).count();
	}

	/** 最近 8 次正式答卷（含分数），项目名一次批量取回，不逐个查 */
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

	// ------ 公共小工具

	/**
	 * 单个子统计的失败兜底：任何 RuntimeException 都只让这一块变成默认值，其余块照常返回。
	 *
	 * <p>首页是聚合接口，一个口径（比如 JSON 脏数据）失败就把整页 500，用户会以为系统挂了。
	 */
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
			// 脏 JSON 不能让「进行中」整块变 0：按不限时间处理，宁可多算一个
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

	/** 建 recent 行时用的中间结构（排序要 createAt / lastAnswerAt，DTO 里没有 createAt） */
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
