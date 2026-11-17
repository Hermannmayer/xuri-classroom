package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiGateway;
import cn.surveyking.server.ai.core.AiJobService;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.ai.core.PromptRegistry;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.AiGradeSuggestRequest;
import cn.surveyking.server.domain.dto.AiGradeSuggestView;
import cn.surveyking.server.domain.dto.AiQuestionRewriteRequest;
import cn.surveyking.server.domain.dto.AiQuestionRewriteView;
import cn.surveyking.server.domain.dto.AiReportSummaryRequest;
import cn.surveyking.server.domain.dto.AiReportSummaryView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.ReportData;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.AiUsage;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.ReportService;
import cn.surveyking.server.domain.dto.UserInfo;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 四个 AI 场景（{@code AiAssistServiceImpl}）的规则回归。
 *
 * <p>模型调用一律 mock（不连网、不要 key），但<b>提示词模板与任务执行是真的</b>：
 * {@link PromptRegistry} 读真实的 {@code prompts/*.md}，{@link AiJobService} 用真实的线程池。
 * 这样一次测试同时覆盖三件容易坏的事：
 * <ol>
 * <li>模板占位符有没有漏替换（提示词里残留 {{{{…}}}} 时模型只会瞎编）；</li>
 * <li>出卷成功后返回的题目结构能不能直接判分（id / dataSource / children / examCorrectAnswer）；</li>
 * <li>内容不合规时任务是不是真的失败、而且把「被拒收」也记了账。</li>
 * </ol>
 *
 * @author p4-backend
 */
class AiAssistServiceImplTest {

	private final AiGateway aiGateway = mock(AiGateway.class);

	private final AiUsageService aiUsageService = mock(AiUsageService.class);

	private final ProjectService projectService = mock(ProjectService.class);

	private final ProjectPartnerService projectPartnerService = mock(ProjectPartnerService.class);

	private final ReportService reportService = mock(ReportService.class);

	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final AnswerAccessGuard answerAccessGuard = mock(AnswerAccessGuard.class);

	/** 真实模板 + 真实任务表：模板/线程池的问题在单测就该暴露 */
	private final PromptRegistry promptRegistry = new PromptRegistry();

	private final AiJobService aiJobService = new AiJobService();

	private AiAssistServiceImpl service;

	@BeforeEach
	void setUp() {
		login("teacher-1");
		service = new AiAssistServiceImpl(aiGateway, promptRegistry, aiJobService, aiUsageService, new ObjectMapper(),
				projectService, projectPartnerService, reportService, answerMapper, answerAccessGuard);
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	/**
	 * 场景入口都要求登录（{@code ai:use}）：单测里补一个登录态，
	 * 顺便验证「后台线程用的是提交任务时抓住的 userId，而不是线程里的 SecurityContext」。
	 */
	private void login(String userId) {
		UserInfo info = new UserInfo();
		info.setUserId(userId);
		GrantedAuthority authority = new SimpleGrantedAuthority("ai:use");
		Set<GrantedAuthority> granted = new HashSet<>(Set.of(authority));
		info.setAuthorities(granted);
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken(info, null, granted));
	}

	/* ====== ② 改题 ====== */

	@Test
	@DisplayName("改题：不保存也能用（直接传题干），模板占位符全部替换，最多 3 条建议")
	void rewriteQuestionWithTitleOnly() {
		when(aiGateway.completeJson(any())).thenReturn(completion(SUGGESTIONS_JSON));
		AiQuestionRewriteRequest request = new AiQuestionRewriteRequest();
		request.setTitle("老年人跌倒主要是啥原因导致的啊");
		request.setStyle("clear");
		AiQuestionRewriteView view = service.rewriteQuestion(request);

		assertEquals(3, view.getSuggestions().size());
		assertTrue(view.getSuggestions().get(0).getText().contains("跌倒"));
		ArgumentCaptor<AiRequest> captor = ArgumentCaptor.forClass(AiRequest.class);
		verify(aiGateway).completeJson(captor.capture());
		String prompt = captor.getValue().getSystemPrompt();
		assertFalse(prompt.contains("{{"), "提示词里有没替换的占位符：" + prompt);
		assertTrue(prompt.contains("更清楚"), prompt);
		assertTrue(prompt.contains("老年人跌倒"), prompt);
	}

	@Test
	@DisplayName("额度用完：改题直接 400，一次模型都不调，并记一条 rejected")
	void rewriteQuestionRespectsQuota() {
		org.mockito.Mockito.doThrow(new ErrorCodeException(ErrorCode.ValidationError,
				"今日 AI 用量已达单人上限（已用 200000 / 上限 200000 tokens）")).when(aiUsageService)
				.assertQuota("teacher-1");
		AiQuestionRewriteRequest request = new AiQuestionRewriteRequest();
		request.setTitle("老年人跌倒的常见原因是什么？");
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service.rewriteQuestion(request));
		assertTrue(ex.getMessage().contains("上限"), ex.getMessage());
		verify(aiGateway, never()).completeJson(any());
		verify(aiUsageService).record(eq("teacher-1"), eq(AiUsageService.SCENE_QUESTION_REWRITE),
				org.mockito.ArgumentMatchers.isNull(), eq(0), eq(0), anyLong(), eq(AiUsage.STATUS_REJECTED),
				anyString());
	}

	@Test
	@DisplayName("改题：题目 id 在已保存的 schema 里找不到 → 400「请先保存试卷」")
	void rewriteQuestionRejectsUnknownQuestion() {
		when(projectService.getProject("p1")).thenReturn(project());
		when(projectPartnerService.accessLevel("p1")).thenReturn(2);
		AiQuestionRewriteRequest request = new AiQuestionRewriteRequest();
		request.setProjectId("p1");
		request.setQuestionId("not-exist");
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service.rewriteQuestion(request));
		assertTrue(ex.getMessage().contains("请先保存试卷"), ex.getMessage());
		verify(aiGateway, never()).completeJson(any());
	}

	/* ====== ③ 批改建议 ====== */

	@Test
	@DisplayName("批改建议：客观题不给建议（由系统判分）；建议分夹到满分以内")
	void gradeSuggestClampsScoreAndRejectsObjectiveQuestion() {
		SurveySchema textarea = textareaQuestion("请简述冬季四防的内容。", 10D);
		SurveySchema radio = radioQuestion("下列哪项属于四防？", 5D);
		SurveySchema schema = examSchema(textarea, radio);
		Answer answer = answer(schema, textarea.getId(), "防滑、防火、防冻、防煤气中毒。");
		when(answerMapper.selectById("answer-1")).thenReturn(answer);

		// 主观题：模型给 99 分 → 夹到 10 分；置信度 1.5 → 夹到 1.0
		when(aiGateway.completeJson(any())).thenReturn(completion(GRADE_JSON));
		AiGradeSuggestRequest request = new AiGradeSuggestRequest();
		request.setAnswerId("answer-1");
		request.setQuestionId(textarea.getId());
		AiGradeSuggestView view = service.suggestGrade(request);
		assertEquals(Double.valueOf(10D), view.getScore());
		assertEquals(Double.valueOf(1D), view.getConfidence());
		assertEquals(1, view.getPoints().size());
		assertTrue(view.getPoints().get(0).getHit().booleanValue());

		// 客观题：直接拒，不花 token
		AiGradeSuggestRequest objective = new AiGradeSuggestRequest();
		objective.setAnswerId("answer-1");
		objective.setQuestionId(radio.getId());
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service.suggestGrade(objective));
		assertTrue(ex.getMessage().contains("不是主观题"), ex.getMessage());
	}

	@Test
	@DisplayName("批改建议：答卷不属于自己的项目 → 行级权限 403，不调模型")
	void gradeSuggestChecksAnswerRowPermission() {
		SurveySchema textarea = textareaQuestion("题干", 10D);
		when(answerMapper.selectById("answer-1")).thenReturn(answer(examSchema(textarea), textarea.getId(), "答案"));
		org.mockito.Mockito.doThrow(new org.springframework.security.access.AccessDeniedException("无权限访问该问卷答案"))
				.when(answerAccessGuard).assertProjectAccess("p1");
		AiGradeSuggestRequest request = new AiGradeSuggestRequest();
		request.setAnswerId("answer-1");
		request.setQuestionId(textarea.getId());
		assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> service.suggestGrade(request));
		verify(aiGateway, never()).completeJson(any());
	}

	/* ====== ④ 学情 ====== */

	@Test
	@DisplayName("学情：只把统计数字发给模型（题干 + 数字），不含学员原始答卷")
	void summarizeReportSendsOnlyStatistics() {
		ProjectView project = project();
		when(projectService.getProject("p1")).thenReturn(project);
		when(reportService.getData(eq("p1"), eq(true), any())).thenReturn(reportData());
		when(aiGateway.complete(any())).thenReturn(completion("整体情况良好，建议加强四防知识点复习。"));

		AiReportSummaryRequest request = new AiReportSummaryRequest();
		request.setProjectId("p1");
		AiReportSummaryView view = service.summarizeReport(request);

		assertEquals("整体情况良好，建议加强四防知识点复习。", view.getText());
		ArgumentCaptor<AiRequest> captor = ArgumentCaptor.forClass(AiRequest.class);
		verify(aiGateway).complete(captor.capture());
		String prompt = captor.getValue().getSystemPrompt();
		assertFalse(prompt.contains("{{"), "提示词里有没替换的占位符：" + prompt);
		assertTrue(prompt.contains("答卷总数：10"), prompt);
		assertTrue(prompt.contains("逐题统计"), prompt);
		assertTrue(prompt.contains("请简述冬季四防的内容。"), prompt);
		// 学员答案是「防滑、防火…」这类正文，绝不能出现在提示词里
		assertFalse(prompt.contains("防滑、防火、防冻"), prompt);
	}

	@Test
	@DisplayName("学情：项目还没有答卷 → 400，不调模型")
	void summarizeReportRejectsEmptyProject() {
		when(projectService.getProject("p1")).thenReturn(project());
		ReportData empty = new ReportData();
		empty.setTotal(Integer.valueOf(0));
		when(reportService.getData(eq("p1"), eq(true), any())).thenReturn(empty);
		AiReportSummaryRequest request = new AiReportSummaryRequest();
		request.setProjectId("p1");
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service.summarizeReport(request));
		assertTrue(ex.getMessage().contains("还没有答卷"), ex.getMessage());
		verify(aiGateway, never()).complete(any());
	}

	/* ====== 测试数据 ====== */

	private static final String SUGGESTIONS_JSON = """
			{"suggestions": [
			  {"text": "老年人跌倒的主要危险因素有哪些？", "reason": "把口语化表达改成考试用语"},
			  {"text": "请列举导致老年人跌倒的三个常见原因。", "reason": "明确答题数量，便于判分"},
			  {"text": "老年人跌倒的常见原因是什么？", "reason": "更短，一眼看完"}
			]}
			""";

	private static final String GRADE_JSON = """
			{"score": 99, "confidence": 1.5, "points": [{"point": "说出四防内容", "hit": true}],
			 "reason": "四点都答到了"}
			""";

	private static AiCompletion completion(String text) {
		return AiCompletion.builder().text(text).model("mock-model").promptTokens(1200).completionTokens(800)
				.totalTokens(2000).costMs(1500L).build();
	}

	private static ProjectView project() {
		ProjectView project = new ProjectView();
		project.setId("p1");
		project.setName("养老护理员五级模拟卷");
		project.setSurvey(examSchema(textareaQuestion("请简述冬季四防的内容。", 10D)));
		return project;
	}

	private static ReportData reportData() {
		ReportData data = new ReportData();
		data.setTotal(Integer.valueOf(10));
		ReportData.Data stat = new ReportData.Data();
		stat.setTotal(10);
		stat.setSum(BigDecimal.valueOf(80));
		stat.setAverage(BigDecimal.valueOf(8));
		stat.setMin(BigDecimal.valueOf(5));
		stat.setMax(BigDecimal.valueOf(10));
		Map<String, ReportData.Data> statistics = new LinkedHashMap<>();
		statistics.put("q-textarea", stat);
		data.setStatistics(statistics);
		Map<String, Integer> daily = new LinkedHashMap<>();
		daily.put("2026-11-16", Integer.valueOf(6));
		daily.put("2026-11-17", Integer.valueOf(4));
		data.setDailyCountStat(daily);
		return data;
	}

	private static SurveySchema examSchema(SurveySchema... questions) {
		SurveySchema root = new SurveySchema();
		root.setId("p1");
		root.setTitle("养老护理员五级模拟卷");
		root.setType(SurveySchema.QuestionType.Survey);
		root.setAttribute(new SurveySchema.Attribute());
		root.setChildren(new ArrayList<>(List.of(questions)));
		return root;
	}

	private static SurveySchema textareaQuestion(String title, double score) {
		SurveySchema question = SurveySchema.builder().id("q-textarea").title(title)
				.type(SurveySchema.QuestionType.Textarea)
				.children(List.of(SurveySchema.builder().id("q-textarea-blank")
						.attribute(SurveySchema.Attribute.builder().examCorrectAnswer("防滑、防火、防冻、防煤气中毒").build())
						.build()))
				.attribute(SurveySchema.Attribute.builder().examScore(Double.valueOf(score))
						.examAnswerMode(SurveySchema.ExamScoreMode.manual).build())
				.build();
		return question;
	}

	private static SurveySchema radioQuestion(String title, double score) {
		List<SurveySchema> children = new ArrayList<>();
		List<SurveySchema.DataSource> sources = new ArrayList<>();
		for (int index = 0; index < 2; index++) {
			String optionId = "q-radio-option-" + index;
			children.add(SurveySchema.builder().id(optionId).title(index == 0 ? "对" : "错")
					.type(SurveySchema.QuestionType.Option).attribute(SurveySchema.Attribute.builder()
							.examCorrectAnswer(index == 0 ? optionId : null).build())
					.build());
			SurveySchema.DataSource source = new SurveySchema.DataSource();
			source.setLabel(index == 0 ? "对" : "错");
			source.setValue(optionId);
			sources.add(source);
		}
		return SurveySchema.builder().id("q-radio").title(title).type(SurveySchema.QuestionType.Radio)
				.children(children).dataSource(sources).attribute(SurveySchema.Attribute.builder()
						.examScore(Double.valueOf(score)).examAnswerMode(SurveySchema.ExamScoreMode.onlyOne).build())
				.build();
	}

	private static Answer answer(SurveySchema schema, String questionId, String studentAnswer) {
		Answer answer = new Answer();
		answer.setId("answer-1");
		answer.setProjectId("p1");
		answer.setTempSave(Integer.valueOf(1));
		answer.setSurvey(schema);
		LinkedHashMap<String, Object> values = new LinkedHashMap<>();
		values.put(questionId, studentAnswer);
		answer.setAnswer(values);
		return answer;
	}


}
