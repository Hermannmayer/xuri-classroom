package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiPaperPickRequest;

/**
 * AI 组卷：从题库抽题拼一份卷子（{@code POST /api/ai/paper/pick}）。
 *
 * <p>为什么是异步：一次组卷要读几十上百道候选题、再让模型挑一遍，30~90 秒是常态，
 * 同步接口在弱网下会被浏览器当成超时。
 *
 * @author ai-actions
 */
public interface AiPaperPickService {

	/**
	 * 提交组卷任务。
	 * @param request 题库 / 章节 / 难度 / 题型配比 / 题量
	 * @return jobId，前端轮询 {@code GET /api/ai/paper/job/{jobId}}
	 */
	String pick(AiPaperPickRequest request);

}
