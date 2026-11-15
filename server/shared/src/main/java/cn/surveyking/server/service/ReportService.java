package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.ReportData;

/**
 * @author javahuang
 * @date 2021/8/3
 */
public interface ReportService {

	/**
	 * 报表数据。
	 * @param shortId 项目 id
	 * @param includeAnonymous 是否包含匿名答卷；管理端传 true，旧接口默认 false
	 */
	ReportData getData(String shortId, boolean includeAnonymous);

	/**
	 * 班级报表：只统计该班答卷（含班级链接匿名）。
	 * @param shortId 项目 id
	 * @param includeAnonymous 是否包含匿名
	 * @param classId 班级 id；为空等价于全项目
	 */
	ReportData getData(String shortId, boolean includeAnonymous, String classId);

}
