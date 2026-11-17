package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.ReportData;

import java.util.Date;

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

	/**
	 * 报表数据（可再按答卷提交时间过滤）。
	 *
	 * <p>时间范围作用在同一条答卷查询上：占比/最值/平均分与每日答卷量都从过滤后的那份列表算出来，
	 * 所以「统计」和「答卷列表」看到的是同一个时间窗。传 null 表示该侧不限；边界都算在范围内。
	 *
	 * <p>前两个重载保留给老调用方（AI 学情总结、班级报表等），等价于时间范围传 null。
	 * @param shortId 项目 id
	 * @param includeAnonymous 是否包含匿名
	 * @param classId 班级 id；为空等价于全项目
	 * @param startTime 答卷提交时间下界（含）；为空不限
	 * @param endTime 答卷提交时间上界（含）；为空不限
	 */
	ReportData getData(String shortId, boolean includeAnonymous, String classId, Date startTime, Date endTime);

}
