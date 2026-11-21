package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.DashboardOverviewView;
import cn.surveyking.server.domain.dto.DashboardTrendView;
import cn.surveyking.server.domain.dto.StudentDashboardView;
import cn.surveyking.server.domain.dto.TeacherDashboardView;
















public interface DashboardStatsService {

	/** 系统级总览（管理员视角的全站数字） */
	DashboardOverviewView overview(int days);

	/** 近 N 个自然日的趋势（按天对齐、缺日补空） */
	DashboardTrendView trend(int days);

	/** 近 N 个自然日的趋势，但只统计当前登录老师可见的项目（老师首页用） */
	DashboardTrendView teacherTrend(int days);

	/** 当前登录老师可见范围内的首页数字 */
	TeacherDashboardView teacher();

	/** 当前登录学员自己的首页数字 */
	StudentDashboardView student();

}
