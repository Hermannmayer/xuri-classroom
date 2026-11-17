package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiRepoAuditApplyRequest;
import cn.surveyking.server.domain.dto.AiRepoAuditRequest;

/**
 * 题库体检：重复题 / 缺解析 / 缺难度章节标签（{@code POST /api/ai/repo/audit}），
 * 以及把老师勾选的建议写回（{@code POST /api/ai/repo/audit/apply}）。
 *
 * @author ai-actions
 */
public interface AiRepoAuditService {

	/** 提交体检任务，返回 jobId */
	String audit(AiRepoAuditRequest request);

	/**
	 * 应用体检建议（只改传了值的字段）。
	 * @return 实际更新的题数
	 */
	int apply(AiRepoAuditApplyRequest request);

}
