package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.DashboardOverviewView;
import cn.surveyking.server.domain.dto.DashboardTrendView;
import cn.surveyking.server.domain.dto.StudentDashboardView;
import cn.surveyking.server.domain.dto.TeacherDashboardView;

/**
 * 首页统计（只读）。四个接口对应首页的四块视角，互不依赖，可以并发调用。
 *
 * <p>与 {@link DashboardService}（老仪表盘组件，只有 /api/dashboard/list）没有任何关系：
 * 那是项目内嵌的组件配置，这里是给首页看板用的聚合数字，所以单独一个服务，不往老接口里塞。
 *
 * <p>实现约定（见 {@code DashboardStatsServiceImpl}）：
 * <ul>
 * <li>只统计未删除数据；</li>
 * <li>每个子统计单独 catch：某个口径算不出来就退化成 0 并记一条 warn，绝不让首页整个 500；</li>
 * <li>numerator 全部走 SQL 聚合（selectCount / selectMaps），不把答卷明细拉进内存。</li>
 * </ul>
 *
 * @author be-stats
 */
public interface DashboardStatsService {

	/**
	 * 系统级总览（管理员视角的全站数字）。
	 *
	 * @param days 与 {@link #trend(int)} 同名的参数，总览内部窗口是固定的（今天 / 7 天 / 30 天），
	 * 该值只做 1~90 的夹取，不影响结果
	 */
	DashboardOverviewView overview(int days);

	/**
	 * 近 N 个自然日的趋势（按天对齐、缺日补空）。
	 * @param days 窗口天数，默认 14，上限 90，小于 1 按默认处理
	 */
	DashboardTrendView trend(int days);

	/** 当前登录老师可见范围内的首页数字 */
	TeacherDashboardView teacher();

	/** 当前登录学员自己的首页数字 */
	StudentDashboardView student();

}
