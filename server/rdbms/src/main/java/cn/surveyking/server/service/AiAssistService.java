package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiGradeSuggestRequest;
import cn.surveyking.server.domain.dto.AiGradeSuggestView;
import cn.surveyking.server.domain.dto.AiPaperApplyRequest;
import cn.surveyking.server.domain.dto.AiPaperApplyView;
import cn.surveyking.server.domain.dto.AiQuestionRewriteRequest;
import cn.surveyking.server.domain.dto.AiQuestionRewriteView;
import cn.surveyking.server.domain.dto.AiReportSummaryRequest;
import cn.surveyking.server.domain.dto.AiReportSummaryView;

import java.util.Map;

/**
 * 内嵌 AI 的场景实现（组卷落库 / 改题 / 批改建议 / 学情 + 任务查询）。
 *
 * <p>为什么场景实现在 rdbms 而不是 ai 模块：
 * <ul>
 * <li>这些场景都要读写业务数据（项目 schema、答卷、报表统计），只能在 rdbms 里做；</li>
 * <li>批改建议必须过答卷的行级权限（{@code AnswerAccessGuard}），它也在 rdbms；</li>
 * <li>ai 模块保持「无 DB 依赖」的纯内核（{@code AiGateway} / {@code PromptRegistry} /
 * {@code AiJobService} / {@code AiContentGuard}），这样内核能被无库单测直接覆盖。</li>
 * </ul>
 *
 * <p>四条硬约束（详见 docs/modules/ai.md）：
 * <ol>
 * <li><b>先预览再落库</b>：组卷 / 体检 / 推荐都只返回结果，写库要老师再调一次 apply；</li>
 * <li><b>批改建议默认不落分</b>：{@link #suggestGrade} 只给建议；唯一的写路径是
 * {@code AiGradeBatchService}（先补未给分的题，可撤销）；</li>
 * <li><b>学情只吃统计数字</b>：{@link #summarizeReport} 不把学员原始答卷发给模型；</li>
 * <li>每次调用都记账（{@code t_ai_usage}），超限额直接拒绝、不调模型。</li>
 * </ol>
 *
 * <p><b>「AI 凭空出卷」已下线</b>（2026-11）：编出来的题没有经过教研、答案也未必对，
 * 老师改起来比自己出还慢。现在出题只走「从题库抽题」：{@code AiPaperPickService}。
 *
 * @author p4-backend
 */
public interface AiAssistService {

	/**
	 * 查 AI 长任务进度（组卷 / 质检 / 题库体检 / 错题推荐 / 批量批改共用同一个任务接口）。
	 * <p>返回 {@code {jobId, scene, status, progress, error, result, createdAt, finishedAt}}；
	 * {@code result} 的具体结构由 scene 决定，前端按场景自行收窄。
	 * <p>只能看自己发起的任务，管理员除外。
	 */
	Map<String, Object> describeJob(String jobId);

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
