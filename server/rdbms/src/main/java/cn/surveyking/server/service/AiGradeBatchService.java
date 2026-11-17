package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiGradeBatchRequest;

/**
 * 批量 AI 批改：把「未批改」答卷里的主观题一次性批掉。
 *
 * <p>硬闸门（写在实现里，接口只是承诺）：
 * <ul>
 * <li>只处理 grade_status=pending 的答卷，且只补「还没给分」的主观题；</li>
 * <li>题目必须有参考答案，没有就跳过并计入 skipped；</li>
 * <li>写入走 {@link AnswerGradeService#submit}，审计由 AOP 记在当前账号名下；</li>
 * <li>返回 undoToken，24 小时内可一键撤销本次写入的分数。</li>
 * </ul>
 *
 * @author ai-actions
 */
public interface AiGradeBatchService {

	/** 发起批改任务，返回 jobId（轮询 /api/ai/paper/job/{jobId}） */
	String start(AiGradeBatchRequest request);

	/**
	 * 撤销一次批量批改（按 undoToken 找到当时写入的「答卷 + 题」并清空）。
	 * @return 被清空的答卷数
	 */
	int undo(String token);

}
