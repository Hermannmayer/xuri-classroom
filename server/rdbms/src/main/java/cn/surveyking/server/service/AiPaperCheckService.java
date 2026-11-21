package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiPaperCheckRequest;






public interface AiPaperCheckService {

	/**
	 * 提交质检任务。
	 * @param request 要体检的项目
	 * @return jobId
	 */
	String check(AiPaperCheckRequest request);

}
