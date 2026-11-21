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







	@PostMapping("/paper/pick")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> pickPaper(@RequestBody AiPaperPickRequest request) {
		String jobId = aiPaperPickService.pick(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}






	@GetMapping("/paper/job/{jobId}")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> job(@PathVariable("jobId") String jobId) {
		return aiAssistService.describeJob(jobId);
	}

	/** 把老师采纳的题目追加进项目 schema（不替换原有内容），返回 {projectId, added, total} */
	@PostMapping("/paper/apply")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('project:update')")
	public AiPaperApplyView applyPaper(@RequestBody AiPaperApplyRequest request) {
		return aiAssistService.applyPaper(request);
	}




	@PostMapping("/paper/check")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> checkPaper(@RequestBody AiPaperCheckRequest request) {
		String jobId = aiPaperCheckService.check(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}




	@PostMapping("/repo/audit")
	@PreAuthorize("hasAuthority('ai:use')")
	public Map<String, Object> auditRepo(@RequestBody AiRepoAuditRequest request) {
		String jobId = aiRepoAuditService.audit(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}


	@PostMapping("/repo/audit/apply")
	@PreAuthorize("hasAuthority('ai:use') and (hasAuthority('repo:update') or hasAuthority('template:update'))")
	public Map<String, Object> applyRepoAudit(@RequestBody AiRepoAuditApplyRequest request) {
		int updated = aiRepoAuditService.apply(request);
		return Collections.singletonMap("updated", Integer.valueOf(updated));
	}




	@PostMapping("/practice/recommend")
	@PreAuthorize("hasAuthority('ai:use') and (hasAuthority('project:report') or hasRole('admin'))")
	public Map<String, Object> recommendPractice(@RequestBody AiPracticeRecommendRequest request) {
		String jobId = aiPracticeRecommendService.recommend(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}




	@PostMapping("/notice/draft")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiNoticeDraftView draftNotice(@RequestBody AiNoticeDraftRequest request) {
		return aiNoticeDraftService.draft(request);
	}



	@PostMapping("/question/rewrite")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiQuestionRewriteView rewriteQuestion(@RequestBody AiQuestionRewriteRequest request) {
		return aiAssistService.rewriteQuestion(request);
	}



	/** 主观题批改建议：{score, confidence, points: [{point, hit}], reason} */
	@PostMapping("/grade/suggest")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('answer:grade')")
	public AiGradeSuggestView suggestGrade(@RequestBody AiGradeSuggestRequest request) {
		return aiAssistService.suggestGrade(request);
	}



	/** 批量批改：把「未批改」答卷里还没给分的主观题一次性批掉 */
	@PostMapping("/grade/batch")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('answer:grade')")
	public Map<String, Object> batchGrade(@RequestBody AiGradeBatchRequest request) {
		String jobId = aiGradeBatchService.start(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		return result;
	}

	/** 撤销一次批量批改：按 undoToken 清空当时写入的分数（24 小时内有效）；返回 {answers: 被清空的答卷数} */
	@PostMapping("/grade/undo")
	@PreAuthorize("hasAuthority('ai:use') and hasAuthority('answer:grade')")
	public Map<String, Object> undoGrade(@RequestParam String token) {
		int answers = aiGradeBatchService.undo(token);
		return Collections.singletonMap("answers", Integer.valueOf(answers));
	}



	@PostMapping("/report/summary")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiReportSummaryView summarizeReport(@RequestBody AiReportSummaryRequest request) {
		return aiAssistService.summarizeReport(request);
	}











	@PostMapping("/chat")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiChatReply chat(@RequestBody AiChatRequest request) {
		return aiAssistantService.chat(request);
	}






	@GetMapping("/status")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiStatusView status() {
		return aiAssistantService.status();
	}






	@GetMapping("/usage/today")
	@PreAuthorize("hasAuthority('ai:use')")
	public AiUsageView usageToday() {
		return aiUsageService.today();
	}

}
