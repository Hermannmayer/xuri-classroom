package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiGradeSuggestRequest;
import cn.surveyking.server.domain.dto.AiGradeSuggestView;
import cn.surveyking.server.domain.dto.AiPaperApplyRequest;
import cn.surveyking.server.domain.dto.AiPaperApplyView;
import cn.surveyking.server.domain.dto.AiPaperGenerateRequest;
import cn.surveyking.server.domain.dto.AiPaperJobView;
import cn.surveyking.server.domain.dto.AiQuestionRewriteRequest;
import cn.surveyking.server.domain.dto.AiQuestionRewriteView;
import cn.surveyking.server.domain.dto.AiReportSummaryRequest;
import cn.surveyking.server.domain.dto.AiReportSummaryView;

/**
 * 内嵌 AI 的四个场景（出卷 / 改题 / 批改建议 / 学情）。
 *
 * <p>为什么场景实现在 rdbms 而不是 ai 模块：
 * <ul>
 * <li>四个场景都要读写业务数据（项目 schema、答卷、报表统计），这些只能在 rdbms 里做；</li>
 * <li>批改建议必须过答卷的行级权限（{@code AnswerAccessGuard}），它也在 rdbms；</li>
 * <li>ai 模块保持「无 DB 依赖」的纯内核（{@code AiGateway} / {@code PromptRegistry} /
 * {@code AiJobService} / {@code AiContentGuard}），这样内核能被无库单测直接覆盖。</li>
 * </ul>
 *
 * <p>四条硬约束（照 docs/ops/2026-11-17-AI与产品化-实施计划.md 6.3）：
 * <ol>
 * <li><b>先预览再落库</b>：出卷只返回结果，写进项目 schema 要老师再调一次 {@link #applyPaper}；</li>
 * <li><b>批改建议不落分</b>：{@link #suggestGrade} 只给建议，落分仍走 {@code POST /api/answer/grade}；</li>
 * <li><b>学情只吃统计数字</b>：{@link #summarizeReport} 不把学员原始答卷发给模型；</li>
 * <li>每次调用都记账（{@code t_ai_usage}），超限额直接拒绝、不调模型。</li>
 * </ol>
 *
 * @author p4-backend
 */
public interface AiAssistService {

	/**
	 * 出卷（异步）：建任务后立刻返回 jobId，前端每 2 秒轮询 {@link #describePaperJob}。
	 * @return 任务 id
	 */
	String generatePaper(AiPaperGenerateRequest request);

	/** 查出卷任务进度（只能看自己发起的，管理员除外） */
	AiPaperJobView describePaperJob(String jobId);

	/**
	 * 把老师采纳的题目<b>追加</b>到项目 schema（不替换原有内容）。
	 * <p>需要 {@code project:update} 与项目可编辑权限；写入前会再过一遍逐题校验，保证采纳的题能判分。
	 */
	AiPaperApplyView applyPaper(AiPaperApplyRequest request);

	/** 改题（同步）：给 3 条建议，老师挑一条自己改 */
	AiQuestionRewriteView rewriteQuestion(AiQuestionRewriteRequest request);

	/**
	 * 批改建议（同步）：给分、置信度、采分点命中情况与理由。
	 * <p>需要 {@code answer:grade} + 答卷行级权限；<b>不会写库</b>。
	 */
	AiGradeSuggestView suggestGrade(AiGradeSuggestRequest request);

	/** 学情总结（同步）：只吃报表统计数字，输出一段纯文本 */
	AiReportSummaryView summarizeReport(AiReportSummaryRequest request);

}
