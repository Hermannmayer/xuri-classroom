package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.DashboardOverviewView;
import cn.surveyking.server.domain.dto.DashboardTrendView;
import cn.surveyking.server.domain.dto.StudentDashboardView;
import cn.surveyking.server.domain.dto.TeacherDashboardView;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.domain.model.Answer;
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
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * 首页统计的口径回归（task-34）。纯 Mockito，不启动 Spring、不连库。
 *
 * <p>重点钉住四件最容易写歪的事：
 * <ol>
 * <li>趋势图按<b>自然日</b>补空：缺的日期补 0，当天没有分数的 avgScores 补 null（不是 0）；</li>
 * <li>passRate 的分母是「有分数的答卷数」，不是全部答卷；没有样本时为 null；</li>
 * <li>待批改/已批改按 grade_status 分别计数，且都只在正式答卷（temp_save=1）里数；</li>
 * <li>「进行中的考试」只能靠 setting JSON 里的 examSetting 时间窗判断（t_project 没有时间列），
 * 脏 JSON 要按「不限时间」兜底而不是让整块变 0。</li>
 * </ol>
 */
class DashboardStatsServiceImplTest {

	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final AnswerItemMapper answerItemMapper = mock(AnswerItemMapper.class);

	private final UserMapper userMapper = mock(UserMapper.class);

	private final UserDeptMapper userDeptMapper = mock(UserDeptMapper.class);

	private final DeptMapper deptMapper = mock(DeptMapper.class);

	private final ProjectMapper projectMapper = mock(ProjectMapper.class);

	private final ProjectPartnerMapper projectPartnerMapper = mock(ProjectPartnerMapper.class);

	private final ClassResourceMapper classResourceMapper = mock(ClassResourceMapper.class);

	private final RepoMapper repoMapper = mock(RepoMapper.class);

	private final TemplateMapper templateMapper = mock(TemplateMapper.class);

	private final AiUsageMapper aiUsageMapper = mock(AiUsageMapper.class);

	private final UserDeptScopeService userDeptScopeService = mock(UserDeptScopeService.class);

	private final ClassService classService = mock(ClassService.class);

	/** 真的 Jackson：setting JSON 的解析要按真实行为验证（脏 JSON 抛错 → 兜底） */
	private final ObjectMapper objectMapper = JsonMapper.builder().build();

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("趋势：按自然日补空，缺的日期补 0、没有分数的日期 avgScores 为 null")
	void trendFillsMissingDays() {
		LocalDate today = LocalDate.now();
		LocalDate yesterday = today.minusDays(1);
		Map<String, Object> yesterdayRow = new HashMap<>();
		yesterdayRow.put("stat_day", java.sql.Date.valueOf(yesterday));
		yesterdayRow.put("cnt", 3L);
		yesterdayRow.put("graded_cnt", 2L);
		yesterdayRow.put("avg_score", 80.5D);
		yesterdayRow.put("active_cnt", 2L);
		// 今天只有暂存/无分数的答卷：计数有值，平均分必须是 null 而不是 0
		Map<String, Object> todayRow = new HashMap<>();
		todayRow.put("stat_day", java.sql.Date.valueOf(today));
		todayRow.put("cnt", 1L);
		todayRow.put("graded_cnt", 0L);
		todayRow.put("avg_score", null);
		todayRow.put("active_cnt", 1L);
		when(answerMapper.selectMaps(any())).thenReturn(List.of(yesterdayRow, todayRow));

		DashboardTrendView view = service().trend(3);

		// 窗口是「含今天在内的最近 3 个自然日」
		assertEquals(3, view.getDays().size());
		assertEquals(today.minusDays(2).format(DateTimeFormatter.ofPattern("MM-dd")), view.getDays().get(0));
		assertEquals(Arrays.asList(0L, 3L, 1L), view.getAnswers());
		assertEquals(Arrays.asList(0L, 2L, 0L), view.getGraded());
		assertNull(view.getAvgScores().get(0));
		assertEquals(80.5D, view.getAvgScores().get(1), 0.0001D);
		assertNull(view.getAvgScores().get(2));
		assertEquals(Arrays.asList(0L, 2L, 1L), view.getActiveUsers());
		// 一条 SQL 出全天数据：按自然日分组，且只算正式答卷、排除练习伪项目
		String sql = capturedAnswerSql();
		assertTrue(sql.contains("GROUP BY DATE(CREATE_AT)"), sql);
		assertTrue(sql.contains("TEMP_SAVE ="), sql);
		assertTrue(sql.contains("PROJECT_ID <>"), sql);
	}

	@Test
	@DisplayName("趋势窗口：默认 14 天，上限 90 天，非法值回落默认")
	void trendWindowIsClamped() {
		when(answerMapper.selectMaps(any())).thenReturn(List.of());

		assertEquals(14, service().trend(0).getDays().size());
		assertEquals(14, service().trend(-3).getDays().size());
		assertEquals(90, service().trend(365).getDays().size());
		assertEquals(1, service().trend(1).getDays().size());
	}

	@Test
	@DisplayName("总览：passRate 以「有分数的答卷数」为分母，待批改/已批改按 grade_status 分开数")
	void overviewCountsPassRateAndPending() {
		// 三次 selectCount 依次是 管理员 / 学员 / 老师（user_type 与角色互斥，总数是三者之和）
		when(userMapper.selectCount(any())).thenReturn(1L, 4L, 5L);
		when(answerMapper.selectMaps(any())).thenReturn(List.of(Map.of("cnt", 9L)), List.of(scoreRow(4L, 72.5D, 98D, 40D, 2L)));
		when(answerMapper.selectCount(any())).thenAnswer(invocation -> {
			// 6 个答卷计数靠 wrapper 里的参数值区分，比按调用顺序 stub 更抗改动。
			// 注意：MyBatis-Plus 的参数值是「生成 SQL 片段时才写进 paramNameValuePairs」的
			// （ISqlSegment 是惰性 lambda），所以必须先取一次 getSqlSegment 再读参数，否则永远读到空 map。
			QueryWrapper<Answer> wrapper = invocation.getArgument(0);
			String sql = wrapper.getSqlSegment().toUpperCase(Locale.ROOT);
			Collection<Object> values = wrapper.getParamNameValuePairs().values();
			// 已批改的 wrapper 也带 pending 参数（它是「不等于 pending」），所以先判 exam_score 条件
			if (sql.contains("EXAM_SCORE IS NOT NULL")) {
				return 3L;
			}
			if (values.contains("pending")) {
				return 7L;
			}
			if (sql.contains("CREATE_AT >=")) {
				return 30L;
			}
			return 100L;
		});

		DashboardOverviewView view = service().overview(14);

		assertEquals(1L, view.getUsers().getAdmin());
		assertEquals(4L, view.getUsers().getStudent());
		assertEquals(5L, view.getUsers().getTeacher());
		// 管理员是 staff 且先被扣掉：合计必须等于三者之和，不能把管理员数两遍
		assertEquals(10L, view.getUsers().getTotal());
		assertEquals(9L, view.getUsers().getActive7d());
		assertEquals(100L, view.getAnswers().getTotal());
		assertEquals(30L, view.getAnswers().getLast7d());
		assertEquals(7L, view.getAnswers().getPending());
		assertEquals(3L, view.getAnswers().getGraded());
		assertEquals(4L, view.getScores().getScoredCount());
		// 4 份有分数的卷里 2 份 >= 60 分 → 50%
		assertEquals(50.0D, view.getScores().getPassRate(), 0.0001D);
		assertEquals(72.5D, view.getScores().getAvg(), 0.0001D);
	}

	@Test
	@DisplayName("总览：没有带分数的答卷时 passRate/avg 为 null（不是 0）")
	void overviewWithoutScoresKeepsNull() {
		when(userMapper.selectCount(any())).thenReturn(0L);
		when(answerMapper.selectMaps(any())).thenReturn(List.of(Map.of("cnt", 0L)),
				List.of(scoreRow(0L, null, null, null, 0L)));

		DashboardOverviewView view = service().overview(14);

		assertNull(view.getScores().getPassRate());
		assertNull(view.getScores().getAvg());
		assertNull(view.getScores().getMax());
		assertEquals(0L, view.getScores().getScoredCount());
	}

	@Test
	@DisplayName("进行中的考试：已发布且当前落在 examSetting 时间窗内；脏 JSON 按不限时间兜底")
	void runningExamsFollowExamWindow() {
		long now = System.currentTimeMillis();
		Map<String, Object> counts = new HashMap<>();
		counts.put("mode", "exam");
		counts.put("status", 1);
		counts.put("cnt", 6L);
		List<Map<String, Object>> publishedExams = List.of(settingRow("p1", "{\"examSetting\":{}}"),
				settingRow("p2", "{\"examSetting\":{\"startTime\":" + (now + 3_600_000L) + "}}"),
				settingRow("p3", "{\"examSetting\":{\"endTime\":" + (now - 1_000L) + "}}"),
				settingRow("p4", "{\"examSetting\":{\"startTime\":" + (now - 1_000L) + ",\"endTime\":"
						+ (now + 1_000L) + "}}"),
				settingRow("p5", "not-a-json"));
		when(projectMapper.selectMaps(any())).thenReturn(List.of(counts), publishedExams);
		when(answerMapper.selectMaps(any())).thenReturn(List.of(Map.of("cnt", 0L)));

		DashboardOverviewView view = service().overview(14);

		assertEquals(6L, view.getProjects().getTotal());
		assertEquals(6L, view.getProjects().getExam());
		assertEquals(6L, view.getProjects().getPublished());
		// p1（两端为空）+ p4（窗口内）+ p5（脏 JSON 兜底）算进行中；p2 未开始、p3 已结束
		assertEquals(3L, view.getProjects().getRunning());
	}

	@Test
	@DisplayName("老师首页：班级只算可见节点，学员按主班+兼报班去重，最近项目最多 8 个且没交过的排最后")
	void teacherRecentKeepsEightLatest() {
		login("t1");
		when(classService.listClassTree(null)).thenReturn(List.of(classNode("c1", true), classNode("c2", false)));
		when(userMapper.selectObjs(any())).thenReturn(List.of("s1", "s2"));
		when(userDeptMapper.selectObjs(any())).thenReturn(List.of("s2", "s3"));
		when(userDeptScopeService.resolveDeptScope("t1")).thenReturn(Set.of());
		when(projectMapper.selectObjs(any())).thenReturn(List.of("p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"));
		when(projectPartnerMapper.selectObjs(any())).thenReturn(List.of());
		when(classResourceMapper.selectObjs(any())).thenReturn(List.of());
		List<Map<String, Object>> projectRows = new ArrayList<>();
		for (int i = 1; i <= 9; i++) {
			Map<String, Object> row = new HashMap<>();
			row.put("id", "p" + i);
			row.put("name", "第 " + i + " 场考试");
			row.put("mode", "exam");
			row.put("status", i <= 5 ? 1 : 0);
			row.put("create_at", new java.util.Date(1_700_000_000_000L + i * 1_000L));
			projectRows.add(row);
		}
		Map<String, Object> totals = new HashMap<>();
		totals.put("cnt", 20L);
		totals.put("pending_cnt", 6L);
		totals.put("avg_score", 81.25D);
		// p1..p8 有答卷，p9 一份没有（应排在最后，因此进不了前 8）
		List<Map<String, Object>> perProject = new ArrayList<>();
		for (int i = 1; i <= 8; i++) {
			Map<String, Object> row = new HashMap<>();
			row.put("project_id", "p" + i);
			row.put("cnt", i);
			row.put("avg_score", 60D + i);
			row.put("pending_cnt", i % 3);
			row.put("last_at", new java.sql.Timestamp(1_700_000_000_000L + i * 60_000L));
			perProject.add(row);
		}
		when(projectMapper.selectMaps(any())).thenReturn(projectRows);
		when(answerMapper.selectMaps(any())).thenReturn(List.of(totals), perProject);
		when(answerMapper.selectCount(any())).thenReturn(2L);

		TeacherDashboardView view = service().teacher();

		// c2 是补路径用的祖先占位节点（accessible=false），不算可见班
		assertEquals(1L, view.getClasses());
		assertEquals(3L, view.getStudents());
		assertEquals(9L, view.getProjects());
		assertEquals(5L, view.getPublished());
		assertEquals(20L, view.getAnswers());
		assertEquals(6L, view.getPendingGrading());
		assertEquals(2L, view.getGraded7d());
		assertEquals(81.3D, view.getAvgScore(), 0.0001D);
		assertEquals(8, view.getRecent().size());
		// 最后交卷时间最晚的排第一；p9 没交过卷，被挤出去
		assertEquals("p8", view.getRecent().get(0).getProjectId());
		assertEquals("p1", view.getRecent().get(7).getProjectId());
		assertTrue(view.getRecent().stream().noneMatch(item -> "p9".equals(item.getProjectId())));
	}

	@Test
	@DisplayName("学员首页：匿名/无登录上下文时全 0 返回，不碰任何 Mapper")
	void anonymousStudentGetsZeros() {
		StudentDashboardView view = service().student();

		assertEquals(0L, view.getAnswers());
		assertEquals(0L, view.getPracticeCount());
		assertNull(view.getAvgScore());
		assertTrue(view.getRecent().isEmpty());
		verifyNoInteractions(answerMapper, userMapper, answerItemMapper);
	}

	@Test
	@DisplayName("响应结构：四个 View 的 JSON 字段与冻结契约一致（前端 task-35 按这个写）")
	void responseShapeMatchesContract() {
		JsonNode overview = toJson(new DashboardOverviewView());
		assertEquals(7, overview.size(), overview.toString());
		assertShape(overview.get("users"), "student", "teacher", "admin", "total", "active7d");
		assertShape(overview.get("classes"), "total", "open", "students", "avgSize");
		assertShape(overview.get("projects"), "total", "exam", "survey", "folder", "published", "running");
		assertShape(overview.get("answers"), "total", "today", "last7d", "last30d", "graded", "pending");
		assertShape(overview.get("questions"), "repos", "templates");
		assertShape(overview.get("scores"), "avg", "passRate", "max", "min", "scoredCount");
		assertShape(overview.get("ai"), "calls7d", "tokens7d");

		assertShape(toJson(new DashboardTrendView()), "days", "answers", "graded", "avgScores", "activeUsers");

		TeacherDashboardView teacher = new TeacherDashboardView();
		teacher.getRecent().add(new TeacherDashboardView.Recent());
		JsonNode teacherJson = toJson(teacher);
		assertShape(teacherJson, "classes", "students", "published", "projects", "answers", "pendingGrading",
				"graded7d", "avgScore", "recent");
		assertShape(teacherJson.get("recent").get(0), "projectId", "projectName", "status", "answerCount", "avgScore",
				"pendingGrading", "lastAnswerAt");

		StudentDashboardView student = new StudentDashboardView();
		student.getRecent().add(new StudentDashboardView.Recent());
		JsonNode studentJson = toJson(student);
		assertShape(studentJson, "answers", "avgScore", "bestScore", "practiceCount", "practiceQuestions", "classes",
				"todoExams", "recent");
		assertShape(studentJson.get("recent").get(0), "projectId", "projectName", "examScore", "createAt");
	}

	// ------ helpers

	private JsonNode toJson(Object value) {
		return objectMapper.readTree(objectMapper.writeValueAsString(value));
	}

	/** 字段名与数量都要对得上：多一个少一个都是破坏前端契约 */
	private static void assertShape(JsonNode node, String... fields) {
		assertTrue(node != null && node.isObject(), "不是 JSON 对象: " + node);
		assertEquals(fields.length, node.size(), "字段数量不符: " + node);
		for (String field : fields) {
			assertTrue(node.get(field) != null, "缺少字段 " + field + ": " + node);
		}
	}

	private DashboardStatsServiceImpl service() {
		return new DashboardStatsServiceImpl(answerMapper, answerItemMapper, userMapper, userDeptMapper, deptMapper,
				projectMapper, projectPartnerMapper, classResourceMapper, repoMapper, templateMapper, aiUsageMapper,
				userDeptScopeService, classService, objectMapper);
	}

	/** 抓答卷查询交给 Mapper 的 Wrapper，转成大写 SQL 片段做结构断言 */
	@SuppressWarnings({ "unchecked", "rawtypes" })
	private String capturedAnswerSql() {
		ArgumentCaptor<Wrapper<Answer>> captor = ArgumentCaptor.forClass((Class) Wrapper.class);
		verify(answerMapper, atLeastOnce()).selectMaps(captor.capture());
		return captor.getValue().getCustomSqlSegment().toUpperCase(Locale.ROOT);
	}

	private void login(String userId) {
		UserInfo info = new UserInfo();
		info.setUserId(userId);
		Set<GrantedAuthority> granted = Set.of(new SimpleGrantedAuthority("project:detail"));
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(info, null, granted));
	}

	private ClassNodeView classNode(String id, boolean accessible) {
		ClassNodeView node = new ClassNodeView();
		node.setId(id);
		node.setName(id);
		node.setAccessible(accessible);
		return node;
	}

	/** 分数聚合的一行：cnt / avg / max / min / passed */
	private Map<String, Object> scoreRow(long cnt, Double avg, Double max, Double min, long passed) {
		Map<String, Object> row = new HashMap<>();
		row.put("cnt", cnt);
		row.put("avg_score", avg);
		row.put("max_score", max);
		row.put("min_score", min);
		row.put("passed", passed);
		return row;
	}

	/** 「已发布考试」的 id + setting JSON */
	private Map<String, Object> settingRow(String id, String setting) {
		Map<String, Object> row = new HashMap<>();
		row.put("id", id);
		row.put("setting", setting);
		return row;
	}

}
