package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.DashboardOverviewView;
import cn.surveyking.server.domain.dto.DashboardTrendView;
import cn.surveyking.server.domain.dto.StudentDashboardView;
import cn.surveyking.server.domain.dto.TeacherDashboardView;
















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

	/**
	 * 近 N 个自然日的趋势，但只统计<b>当前登录老师可见的项目</b>（老师首页用）。
	 *
	 * <p>为什么不直接复用 {@link #trend(int)}：那个是全站口径（管理员视角），老师首页拿它画图，
	 * 画出来的是别人的答卷——数字对不上卡片、还会泄露自己看不到的项目规模。
	 * 这里的项目范围与 {@link #teacher()} 完全相同（自己创建 ∪ 所有者/协作者 ∪ 可见班级上分配过的资源），
	 * 两处共用同一段取数代码，避免各写一遍后漂移。
	 *
	 * <p>返回结构与 {@link #trend(int)} 一致：五个数组等长、按下标对齐；没有任何可见项目时
	 * 返回「整段 0 值」的完整窗口，而不是空数组或 null。
	 *
	 * @param days 窗口天数，默认 14，上限 90，小于 1 按默认处理
	 */
	DashboardTrendView teacherTrend(int days);

	/** 当前登录老师可见范围内的首页数字 */
	TeacherDashboardView teacher();

	/** 当前登录学员自己的首页数字 */
	StudentDashboardView student();

}
