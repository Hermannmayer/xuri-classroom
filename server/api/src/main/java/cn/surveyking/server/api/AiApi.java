package cn.surveyking.server.api;

import cn.surveyking.server.ai.domain.AiChatReply;
import cn.surveyking.server.ai.domain.AiChatRequest;
import cn.surveyking.server.ai.domain.AiStatusView;
import cn.surveyking.server.domain.dto.AiGradeBatchRequest;
import cn.surveyking.server.domain.dto.AiGradeSuggestRequest;
import cn.surveyking.server.domain.dto.AiGradeSuggestView;
import cn.surveyking.server.domain.dto.AiNoticeDraftRequest;
import cn.surveyking.server.domain.dto.AiNoticeDraftView;
import cn.surveyking.server.domain.dto.AiPaperApplyRequest;
import cn.surveyking.server.domain.dto.AiPaperApplyView;
import cn.surveyking.server.domain.dto.AiPaperCheckRequest;
import cn.surveyking.server.domain.dto.AiPaperPickRequest;
import cn.surveyking.server.domain.dto.AiPracticeRecommendRequest;
import cn.surveyking.server.domain.dto.AiQuestionRewriteRequest;
import cn.surveyking.server.domain.dto.AiQuestionRewriteView;
import cn.surveyking.server.domain.dto.AiRepoAuditApplyRequest;
import cn.surveyking.server.domain.dto.AiRepoAuditRequest;
import cn.surveyking.server.domain.dto.AiReportSummaryRequest;
import cn.surveyking.server.domain.dto.AiReportSummaryView;
import cn.surveyking.server.domain.dto.AiUsageView;
import cn.surveyking.server.service.AiAssistService;
import cn.surveyking.server.service.AiGradeBatchService;
import cn.surveyking.server.service.AiNoticeDraftService;
import cn.surveyking.server.service.AiPaperCheckService;
import cn.surveyking.server.service.AiPaperPickService;
import cn.surveyking.server.service.AiPracticeRecommendService;
import cn.surveyking.server.service.AiRepoAuditService;
import cn.surveyking.server.service.AiAssistantService;
import cn.surveyking.server.service.AiUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * AI 能力的统一入口：组卷 / 质检 / 题库体检 / 错题重练 / 公告草稿 / 批改（建议与批量）/ 学情 / 对话。
 *
 * <p>为什么统一放一个 Controller：所有能力共用一条权限口径（{@code ai:use}）与同一份限额，
 * 分散成七个 Controller 只会让「哪些接口要 AI 权限」更难一眼看清。与学员侧的
 * {@code ChatController}（{@code /api/ai/chat/**}，答题解析用）刻意分开：那条路径是流式、面向学员，
 * 这条是结构化、面向老师。
 *
 * <p>权限：
 * <ul>
 * <li>全部要 {@code ai:use}（默认给 admin / teacher，学员不给）；</li>
 * <li>{@code /paper/apply} 写项目 schema，另要 {@code project:update}；</li>
 * <li>{@code /repo/audit/apply} 写题库，另要 {@code repo:update} 或 {@code template:update}；</li>
 * <li>{@code /grade/suggest} 与 {@code /grade/batch|undo} 另要 {@code answer:grade}；</li>
 * <li>{@code /practice/recommend} 要读报表，另要 {@code project:report}；</li>
 * <li>{@code /notice/draft} 发全站受众时另要 {@code notice:manage:system}（在服务层判）。</li>
 * </ul>
 *
 * <p><b>长任务统一走 {@code /paper/job/{jobId}}</b>：组卷、质检、题库体检、错题推荐、批量批改
 * 都是「几十秒到几分钟」的任务，共用 {@code AiJobService} 的任务表与轮询接口；
 * 返回的 {@code result} 结构由场景决定（见各 {@code *View}）。
 *
 * <p><b>「AI 凭空出卷」已下线</b>：出题只走从题库抽题（{@code /paper/pick}）。
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

	private final AiPaperPickService aiPaperPickService;

	private final AiPaperCheckService aiPaperCheckService;

	private final AiRepoAuditService aiRepoAuditService;

	private final AiPracticeRecommendService aiPracticeRecommendService;

	private final AiNoticeDraftService aiNoticeDraftService;

	private final AiGradeBatchService aiGradeBatchService;

	/* ====== ① AI 组卷（从题库抽题，异步） ====== */

	/**
	 * 创建组卷任务：立刻返回 jobId，前端每 2 秒轮询 {@code /paper/job/{jobId}}。
	 * <p>题库里题不够时任务照样完成，{@code missing} 会告诉老师差几题。
	 */
	@PostMapping("/paper/pick")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> pickPaper(@RequestBody AiPaperPickRequest request) {
		String jobId = aiPaperPickService.pick(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}

	/**
	 * 查 AI 长任务：{jobId, scene, status, progress, error, result}。
	 * <p>status 取值 queued / running / done / failed；失败时 error 是中文原因，result 为 null。
	 * <p>任务在内存里，进程重启后会返回 400「AI 任务不存在或已过期」，重新发起即可。
	 */
	@GetMapping("/paper/job/{jobId}")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> job(@PathVariable("jobId") String jobId) {
		return aiAssistService.describeJob(jobId);
	}

	/**
	 * 把老师采纳的题目追加进项目 schema（不替换原有内容），返回 {projectId, added, total}。
	 */
	@PostMapping("/paper/apply")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('project:update')")
	public AiPaperApplyView applyPaper(@RequestBody AiPaperApplyRequest request) {
		return aiAssistService.applyPaper(request);
	}

	/* ====== ② 试卷质检（异步） ====== */

	/** 考前一键体检：重复题、缺分值、缺答案、难度分布、考点覆盖 */
	@PostMapping("/paper/check")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> checkPaper(@RequestBody AiPaperCheckRequest request) {
		String jobId = aiPaperCheckService.check(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}

	/* ====== ③ 题库体检（异步 + 应用建议） ====== */

	/** 题库体检：重复题、缺解析、缺难度章节标签（只给建议，不写库） */
	@PostMapping("/repo/audit")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> auditRepo(@RequestBody AiRepoAuditRequest request) {
		String jobId = aiRepoAuditService.audit(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}

	/** 应用体检建议：只写老师勾选的字段 */
	@PostMapping("/repo/audit/apply")
	@PreAuthorize("hasAuthority('ai:use') and (hasAuthority('repo:update') or hasAuthority('template:update'))")
	public Map<String, Object> applyRepoAudit(@RequestBody AiRepoAuditApplyRequest request) {
		int updated = aiRepoAuditService.apply(request);
		return Collections.singletonMap("updated", Integer.valueOf(updated));
	}

	/* ====== ④ 错题重练（异步） ====== */

	/** 按某场考试（可限定班级）的得分率找薄弱考点，再从题库抽一组重练题 */
	@PostMapping("/practice/recommend")
	@PreAuthorize("hasAuthority('ai:use') and (hasAuthority('project:report') or hasRole('admin'))")
	public Map<String, Object> recommendPractice(@RequestBody AiPracticeRecommendRequest request) {
		String jobId = aiPracticeRecommendService.recommend(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}

	/* ====== ⑤ 公告草稿（同步） ====== */

	/** 把几句要点补成一条规范通知草稿（不发布） */
	@PostMapping("/notice/draft")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiNoticeDraftView draftNotice(@RequestBody AiNoticeDraftRequest request) {
		return aiNoticeDraftService.draft(request);
	}

	/* ====== ⑥ AI 改题（同步） ====== */

	@PostMapping("/question/rewrite")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiQuestionRewriteView rewriteQuestion(@RequestBody AiQuestionRewriteRequest request) {
		return aiAssistService.rewriteQuestion(request);
	}

	/* ====== ⑦ AI 批改建议（同步，只给建议不落分） ====== */

	/**
	 * 主观题批改建议：{score, confidence, points: [{point, hit}], reason}。
	 * <p><b>不会写库</b>：老师点「采纳」才走已有的 {@code POST /api/answer/grade}，责任留在人身上。
	 * <p>要「整卷批掉」用 {@link #batchGrade}：那条路径会写库，但只补未给分的题并且可撤销。
	 */
	@PostMapping("/grade/suggest")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('answer:grade')")
	public AiGradeSuggestView suggestGrade(@RequestBody AiGradeSuggestRequest request) {
		return aiAssistService.suggestGrade(request);
	}

	/* ====== ⑧ 批量 AI 批改（异步，可撤销） ====== */

	/**
	 * 批量批改：把「未批改」答卷里还没给分的主观题一次性批掉。
	 * <p>只处理 grade_status=pending 的答卷、只补没分的题、必须有参考答案；写入走既有批改服务，
	 * 审计自动记在当前账号名下。
	 */
	@PostMapping("/grade/batch")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('answer:grade')")
	public Map<String, Object> batchGrade(@RequestBody AiGradeBatchRequest request) {
		String jobId = aiGradeBatchService.start(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}

	/**
	 * 撤销一次批量批改：按 undoToken 清空当时写入的分数（24 小时内有效）。
	 * @return {@code {answers: 被清空的答卷数}}
	 */
	@PostMapping("/grade/undo")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('answer:grade')")
	public Map<String, Object> undoGrade(@RequestParam String token) {
		int answers = aiGradeBatchService.undo(token);
		return Collections.singletonMap("answers", Integer.valueOf(answers));
	}

	/* ====== ⑨ AI 学情（同步，只吃统计数字） ====== */

	@PostMapping("/report/summary")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiReportSummaryView summarizeReport(@RequestBody AiReportSummaryRequest request) {
		return aiAssistService.summarizeReport(request);
	}

	/* ====== ⑩ AI 助手对话（多轮） ====== */

	/**
	 * 对话：一问一答，历史由前端带上（只留在内存里，刷新即丢，不落库）。
	 * <p>请求里的 {@code context} 只描述「在哪一页、哪个 id」；试卷名 / 题干 / 答卷信息一律由后端按 id
	 * 查库并过权限后补进系统提示。
	 * <p><b>这条接口会执行动作</b>：先做一次意图识别（批改 / 组卷 / 体检 / 报表 / 通知…），
	 * 能执行的直接执行并把结果放在 {@code action} 里；识别不出才走普通问答。
	 * <p>没配模型时返回 <b>400 + 中文原因</b>；想提前知道就调 {@code GET /api/ai/status}。
	 */
	@PostMapping("/chat")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiChatReply chat(@RequestBody AiChatRequest request) {
		return aiAssistantService.chat(request);
	}

	/**
	 * 现在能不能聊：{enabled, ready, reason, model}。
	 * <p>{@code enabled=false} 表示系统设置里 AI 总开关是关的——前端连悬浮按钮都不该显示；
	 * {@code ready=false} 但 enabled=true 时入口要显示，点开告诉管理员「还差哪一步」。
	 */
	@GetMapping("/status")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiStatusView status() {
		return aiAssistantService.status();
	}

	/* ====== 用量 ====== */

	/**
	 * 当日用量：{userTokens, userLimit, dailyTokens, dailyLimit, scenes: [{scene, calls, tokens}]}。
	 */
	@GetMapping("/usage/today")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiUsageView usageToday() {
		return aiUsageService.today();
	}

}
