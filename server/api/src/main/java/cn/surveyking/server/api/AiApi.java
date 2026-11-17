package cn.surveyking.server.api;

import cn.surveyking.server.ai.domain.AiChatReply;
import cn.surveyking.server.ai.domain.AiChatRequest;
import cn.surveyking.server.ai.domain.AiStatusView;
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
import cn.surveyking.server.domain.dto.AiUsageView;
import cn.surveyking.server.service.AiAssistService;
import cn.surveyking.server.service.AiAssistantService;
import cn.surveyking.server.service.AiUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 内嵌 AI 的四个场景（出卷 / 改题 / 批改建议 / 学情）+ 侧栏对话 + 当日用量。
 *
 * <p>为什么统一放一个 Controller：四个场景共用一条权限口径（{@code ai:use}）与同一份限额，
 * 分散成四个 Controller 只会让「哪些接口要 AI 权限」更难一眼看清。与学员侧的
 * {@code ChatController}（{@code /api/ai/chat/**}，答题解析用）刻意分开：那条路径是流式、面向学员，
 * 这条是结构化、面向老师。
 *
 * <p>权限：
 * <ul>
 * <li>全部要 {@code ai:use}（默认给 admin / teacher，学员不给）；</li>
 * <li>{@code /paper/apply} 写项目 schema，另要 {@code project:update}；</li>
 * <li>{@code /grade/suggest} 另要 {@code answer:grade}。</li>
 * </ul>
 *
 * <p><b>为什么不用 {@code @EnableDataPerm}</b>：那个切面用 SpEL 取 projectId 后直接
 * {@code .toString()}，出卷（projectId 可空）与改题（可以只传题干）会直接 NPE 变成 500。
 * 项目级/答卷级的数据权限因此放在 Service 里判（{@code ProjectPartnerService#accessLevel}、
 * {@code AnswerAccessGuard}），错误信息也能说清是「没有权限访问该项目」还是「没有权限访问该问卷答案」。
 *
 * @author p4-backend
 */
@RestController
@RequestMapping("${api.prefix}/ai")
@RequiredArgsConstructor
public class AiApi {

	private final AiAssistService aiAssistService;

	private final AiAssistantService aiAssistantService;

	private final AiUsageService aiUsageService;

	/* ====== ① AI 出卷（异步） ====== */

	/**
	 * 创建出卷任务：立刻返回 jobId，前端每 2 秒轮询 {@code /paper/job/{jobId}}。
	 * <p>projectId 可空（空 = 只生成不入库）；限额在提交时就判一次，超限直接 400，不建任务。
	 */
	@PostMapping("/paper/generate")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> generatePaper(@RequestBody AiPaperGenerateRequest request) {
		String jobId = aiAssistService.generatePaper(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}

	/**
	 * 查出卷进度/结果：{jobId, status, progress, error, result}。
	 * <p>status 取值 queued / running / done / failed；失败时 error 是中文原因，result 为 null。
	 * <p>任务在内存里，进程重启后会返回 400「AI 任务不存在或已过期」，重新生成即可。
	 */
	@GetMapping("/paper/job/{jobId}")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiPaperJobView paperJob(@PathVariable("jobId") String jobId) {
		return aiAssistService.describePaperJob(jobId);
	}

	/**
	 * 把老师采纳的题目追加进项目 schema（不替换原有内容），返回 {projectId, added, total}。
	 * <p>编辑器的主路径是「写画布 → 老师点保存」，这个接口留给「采纳并立即保存」与后续 MCP/脚本；
	 * 行级闸门在 {@code ProjectService#updateProject} 里（要可编辑权限）。
	 */
	@PostMapping("/paper/apply")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('project:update')")
	public AiPaperApplyView applyPaper(@RequestBody AiPaperApplyRequest request) {
		return aiAssistService.applyPaper(request);
	}

	/* ====== ② AI 改题（同步） ====== */

	/**
	 * 给 3 条改写建议：{suggestions: [{text, reason}]}。
	 * <p>题目可以只传 questionId（从已保存的 schema 取），也可以直接传 title（编辑器有未保存改动时用）。
	 */
	@PostMapping("/question/rewrite")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiQuestionRewriteView rewriteQuestion(@RequestBody AiQuestionRewriteRequest request) {
		return aiAssistService.rewriteQuestion(request);
	}

	/* ====== ③ AI 批改建议（同步，只给建议不落分） ====== */

	/**
	 * 主观题批改建议：{score, confidence, points: [{point, hit}], reason}。
	 * <p><b>不会写库</b>：老师点「采纳」才走已有的 {@code POST /api/answer/grade}，责任留在人身上。
	 */
	@PostMapping("/grade/suggest")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('answer:grade')")
	public AiGradeSuggestView suggestGrade(@RequestBody AiGradeSuggestRequest request) {
		return aiAssistService.suggestGrade(request);
	}

	/* ====== ④ AI 学情（同步，只吃统计数字） ====== */

	/**
	 * 学情总结：{text}。只把报表统计数字发给模型，不含学员原始答卷与姓名。
	 */
	@PostMapping("/report/summary")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiReportSummaryView summarizeReport(@RequestBody AiReportSummaryRequest request) {
		return aiAssistService.summarizeReport(request);
	}

	/* ====== ⑤ 侧栏 AI 助手（多轮对话） ====== */

	/**
	 * 对话：一问一答，历史由前端带上（只留在内存里，刷新即丢，不落库）。
	 * <p>请求里的 {@code context} 只描述「在哪一页、哪个 id」；试卷名 / 题干 / 答卷信息一律由后端按 id
	 * 查库并过权限后补进系统提示（见 {@code AiAssistantServiceImpl}），前端给的文案不采信。
	 * <p>没配模型时返回 <b>400 + 中文原因</b>（「AI 功能未启用，请先在系统设置里配置模型」等），
	 * 前端据此显示「去系统设置」的引导；想提前知道就调 {@code GET /api/ai/status}。
	 * <p><b>为什么不做流式</b>：侧栏是「一轮一答」，而输出要过 {@code AiContentGuard} 才能给用户看，
	 * 流式等于把未经校验的内容先露出去，校验就失去意义了。
	 */
	@PostMapping("/chat")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiChatReply chat(@RequestBody AiChatRequest request) {
		return aiAssistantService.chat(request);
	}

	/**
	 * 现在能不能聊：{ready, reason, model}。
	 * <p>侧栏打开时先问一次，省得用户打完一段话、点了发送才看到 400；
	 * 判断口径与 {@code /chat} 完全一致（同一个 {@code AiGateway#readiness()}）。
	 */
	@GetMapping("/status")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiStatusView status() {
		return aiAssistantService.status();
	}

	/* ====== 用量 ====== */

	/**
	 * 当日用量：{userTokens, userLimit, dailyTokens, dailyLimit, scenes: [{scene, calls, tokens}]}。
	 * <p>给 AI 入口显示剩余额度用；数字与限额判断同一口径（都来自 {@code t_ai_usage}）。
	 */
	@GetMapping("/usage/today")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiUsageView usageToday() {
		return aiUsageService.today();
	}

}
