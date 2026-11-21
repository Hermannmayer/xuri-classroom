package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.ReportData;

import java.util.Date;





public interface ReportService {

	/** 报表数据 */
	ReportData getData(String shortId, boolean includeAnonymous);

	/** 班级报表：只统计该班答卷（含班级链接匿名） */
	ReportData getData(String shortId, boolean includeAnonymous, String classId);

	/** 报表数据（可再按答卷提交时间过滤） */
	ReportData getData(String shortId, boolean includeAnonymous, String classId, Date startTime, Date endTime);

}
