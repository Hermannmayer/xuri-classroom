package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiPaperPickRequest;









public interface AiPaperPickService {

	/** 提交组卷任务；返回 jobId，前端轮询 {@code GET /api/ai/paper/job/{jobId}}。 */
	String pick(AiPaperPickRequest request);

}
