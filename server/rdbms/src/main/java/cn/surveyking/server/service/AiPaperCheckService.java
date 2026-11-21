package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiPaperCheckRequest;






public interface AiPaperCheckService {

	/** 提交质检任务；返回 jobId。 */
	String check(AiPaperCheckRequest request);

}
