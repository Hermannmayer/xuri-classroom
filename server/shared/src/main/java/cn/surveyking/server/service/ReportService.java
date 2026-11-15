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

}
