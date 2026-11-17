package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.DashboardTrendView;
import cn.surveyking.server.service.DashboardService;
import cn.surveyking.server.service.DashboardStatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Arrays;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 首页统计接口的契约回归（task-43）。
 *
 * <p>老师首页按 {@code /api/dashboard/teacher/trend?days=14} 取数：路径或参数名一改，页面就是
 * 「整块图变成 — + 一行原因」，而 {@code tsc} 只检查前端自己写的字符串，发现不了后端改名。
 * 所以把这条新接口的形状钉在这里（五个等长数组 + days 默认 14）。
 *
 * <p>standalone MockMvc + mock service：不启动 Spring 上下文、不连库，和 {@code NoticeApiTest} 同一套做法。
 * 权限是 {@code @PreAuthorize}，standalone 不装 AOP 拦截器，这里只验路径/参数/返回结构，不验鉴权。
 */
class DashboardApiTest {

	private DashboardStatsService dashboardStatsService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		dashboardStatsService = mock(DashboardStatsService.class);
		// ${api.prefix} 在 standalone 环境里没有 application.yml，手动给成线上的 /api
		mockMvc = MockMvcBuilders
				.standaloneSetup(new DashboardApi(mock(DashboardService.class), dashboardStatsService))
				.addPlaceholderValue("api.prefix", "/api")
				.build();
	}

	@Test
	@DisplayName("GET /api/dashboard/teacher/trend?days=14 -> 五个等长数组")
	void teacherTrendShape() throws Exception {
		when(dashboardStatsService.teacherTrend(14)).thenReturn(trend());

		mockMvc.perform(get("/api/dashboard/teacher/trend").param("days", "14"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.days.length()").value(3))
				.andExpect(jsonPath("$.answers.length()").value(3))
				.andExpect(jsonPath("$.graded.length()").value(3))
				.andExpect(jsonPath("$.avgScores.length()").value(3))
				.andExpect(jsonPath("$.activeUsers.length()").value(3))
				.andExpect(jsonPath("$.answers[2]").value(3))
				.andExpect(jsonPath("$.graded[2]").value(1))
				.andExpect(jsonPath("$.avgScores[2]").value(80.5))
				.andExpect(jsonPath("$.activeUsers[2]").value(2));
		verify(dashboardStatsService).teacherTrend(14);
	}

	@Test
	@DisplayName("GET /api/dashboard/teacher/trend 不带 days -> 默认 14 天")
	void teacherTrendDefaultsTo14Days() throws Exception {
		when(dashboardStatsService.teacherTrend(14)).thenReturn(trend());

		mockMvc.perform(get("/api/dashboard/teacher/trend")).andExpect(status().isOk());

		// 默认值写在 @RequestParam(defaultValue = "14") 上：前端不传也能拿到 14 天窗口
		verify(dashboardStatsService).teacherTrend(14);
		verifyNoMoreInteractions(dashboardStatsService);
	}

	@Test
	@DisplayName("GET /api/dashboard/teacher/trend?days=30 -> days 原样传给服务层")
	void teacherTrendPassesDaysThrough() throws Exception {
		when(dashboardStatsService.teacherTrend(30)).thenReturn(trend());

		mockMvc.perform(get("/api/dashboard/teacher/trend").param("days", "30")).andExpect(status().isOk());

		// 夹取在服务层做（1~90），接口层不改写参数，避免两处各有一套窗口规则
		verify(dashboardStatsService).teacherTrend(30);
	}

	private static DashboardTrendView trend() {
		DashboardTrendView view = new DashboardTrendView();
		view.setDays(Arrays.asList("11-15", "11-16", "11-17"));
		view.setAnswers(Arrays.asList(0L, 0L, 3L));
		view.setGraded(Arrays.asList(0L, 0L, 1L));
		view.setAvgScores(Arrays.asList(null, null, 80.5D));
		view.setActiveUsers(Arrays.asList(0L, 0L, 2L));
		return view;
	}

}
