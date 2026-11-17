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

/**
 * @author javahuang
 * @date 2022/1/28
 *
 * <p>两条互不相干的线，别混：
 * <ul>
 * <li>{@code /list}：项目里内嵌的仪表盘组件（老的 surveyking 能力，只有列表查询）；</li>
 * <li>{@code /overview}、{@code /trend}、{@code /teacher}、{@code /teacher/trend}、{@code /student}：
 * 首页看板（task-34 / task-43），走 {@link DashboardStatsService}。{@code /overview} 与 {@code /trend}
 * 是系统级口径（管理员视角），其余三个按当前登录人的可见范围（老师=可见项目，学员=只看自己）。</li>
 * </ul>
 *
 * <p>五条首页接口的权限统一是 {@code project:detail} 或 admin：能进项目就被视为能看到看板；
 * 数据本身的裁剪（老师的班级/项目可见范围、学员只看自己）在服务层做，注解只做粗筛。
 */
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

	/**
	 * 首页总览：人 / 班 / 卷 / 答卷 / 题库 / 分数 / AI 七个块一次返回。
	 *
	 * <p>{@code days} 只为和趋势接口用同一套调用签名，总览内部窗口固定（今天 / 7 天 / 30 天）。
	 */
	@GetMapping("/overview")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public DashboardOverviewView overview(@RequestParam(required = false, defaultValue = "14") int days) {
		return dashboardStatsService.overview(days);
	}

	/**
	 * 首页趋势图：近 {@code days} 个自然日（默认 14，上限 90），缺的日期补 0 / 当天没有分数补 null。
	 *
	 * <p>五个数组等长且按下标对齐，前端直接按下标画折线即可。
	 */
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

	/**
	 * 老师视角的趋势：结构同 {@link #trend(int)}，但只统计 {@link #teacher()} 那批可见项目。
	 *
	 * <p>老师首页的柱状图必须用这个而不是 {@code /trend}：后者是全站口径，老师看到的是别人的答卷，
	 * 属于误导（卡片写「我的教学」，图里却是全校数据）。权限与会话口径都跟 {@code /teacher} 对齐。
	 */
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
