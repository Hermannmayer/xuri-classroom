package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiPaperPickRequest;









public interface AiPaperPickService {

	/**
	 * 提交组卷任务。
	 * @param request 题库 / 章节 / 难度 / 题型配比 / 题量
	 * @return jobId，前端轮询 {@code GET /api/ai/paper/job/{jobId}}
	 */
	String pick(AiPaperPickRequest request);

}
