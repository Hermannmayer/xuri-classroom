package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiGradeBatchRequest;














public interface AiGradeBatchService {

	/** 发起批改任务，返回 jobId（轮询 /api/ai/paper/job/{jobId}） */
	String start(AiGradeBatchRequest request);

	/**
	 * 撤销一次批量批改（按 undoToken 找到当时写入的「答卷 + 题」并清空）。
	 * @return 被清空的答卷数
	 */
	int undo(String token);

}
