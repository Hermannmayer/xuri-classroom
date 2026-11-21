package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiRepoAuditApplyRequest;
import cn.surveyking.server.domain.dto.AiRepoAuditRequest;







public interface AiRepoAuditService {

	/** 提交体检任务，返回 jobId */
	String audit(AiRepoAuditRequest request);

	/**
	 * 应用体检建议（只改传了值的字段）。
	 * @return 实际更新的题数
	 */
	int apply(AiRepoAuditApplyRequest request);

}
