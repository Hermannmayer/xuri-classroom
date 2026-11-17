package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiPaperCheckRequest;

/**
 * 试卷质检：考前一键体检（{@code POST /api/ai/paper/check}）。
 *
 * @author ai-actions
 */
public interface AiPaperCheckService {

	/**
	 * 提交质检任务。
	 * @param request 要体检的项目
	 * @return jobId
	 */
	String check(AiPaperCheckRequest request);

}
