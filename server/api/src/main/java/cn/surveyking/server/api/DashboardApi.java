package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.DashboardOverviewView;
import cn.surveyking.server.domain.dto.DashboardQuery;
import cn.surveyking.server.domain.dto.DashboardTrendView;
import cn.surveyking.server.domain.dto.DashboardView;
import cn.surveyking.server.domain.dto.StudentDashboardView;
import cn.surveyking.server.domain.dto.TeacherDashboardView;
import cn.surveyking.server.service.DashboardService;
import cn.surveyking.server.service.DashboardStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
















@RestController
@RequestMapping("${api.prefix}/dashboard")
@RequiredArgsConstructor
public class DashboardApi {

	private final DashboardService dashboardService;

	private final DashboardStatsService dashboardStatsService;

	@GetMapping("/list")
	@PreAuthorize("hasAuthority('project:detail')")
	public List<DashboardView> listDashboard(DashboardQuery query) {
		return dashboardService.listDashboard(query);
	}

	/** 首页总览：人 / 班 / 卷 / 答卷 / 题库 / 分数 / AI 七个块一次返回 */
	@GetMapping("/overview")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public DashboardOverviewView overview(@RequestParam(required = false, defaultValue = "14") int days) {
		return dashboardStatsService.overview(days);
	}

	/** 首页趋势图：近 days 个自然日（默认 14，上限 90），缺的日期补 0 / 当天没有分数补 null */
	@GetMapping("/trend")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public DashboardTrendView trend(@RequestParam(required = false, defaultValue = "14") int days) {
		return dashboardStatsService.trend(days);
	}

	/** 老师视角：按当前老师可见的班级/项目统计，供老师首页用 */
	@GetMapping("/teacher")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public TeacherDashboardView teacher() {
		return dashboardStatsService.teacher();
	}

	/** 老师视角的趋势：结构同 #trend(int)，但只统计 #teacher() 那批可见项目 */
	@GetMapping("/teacher/trend")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public DashboardTrendView teacherTrend(@RequestParam(required = false, defaultValue = "14") int days) {
		return dashboardStatsService.teacherTrend(days);
	}

	/** 学员视角：只看当前登录学员自己的答卷/练习/待考 */
	@GetMapping("/student")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public StudentDashboardView student() {
		return dashboardStatsService.student();
	}

}
