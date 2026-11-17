package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiChatTurn;
import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiContentGuard;
import cn.surveyking.server.ai.core.AiConversation;
import cn.surveyking.server.ai.core.AiGateway;
import cn.surveyking.server.ai.core.AiPageContext;
import cn.surveyking.server.ai.core.AiReadiness;
import cn.surveyking.server.ai.core.PromptRegistry;
import cn.surveyking.server.ai.domain.AiChatReply;
import cn.surveyking.server.ai.domain.AiChatRequest;
import cn.surveyking.server.ai.domain.AiStatusView;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.AiUsage;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.service.AiAssistantService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 侧栏 AI 助手的实现：把「历史消息 + 当前页面上下文」拼成一次多轮对话调用。
 *
 * <p>四条与其它 AI 场景一致的硬口径：
 * <ol>
 * <li><b>系统提示只由后端生成</b>：前端传的 {@code system} 消息在这里被丢掉，
 * 上下文里的试卷名/题干也是按 id 查库得到的，不接受前端直接给的自由文本；</li>
 * <li><b>上下文要过权限</b>：带 projectId 就走项目只读闸门、带 answerId 就走答卷闸门，
 * 拿不到权限直接 403，而不是「悄悄少给一段上下文」（那会让用户以为 AI 看不到是因为没这功能）；</li>
 * <li><b>每次调用都记账</b>（{@code t_ai_usage}，场景 {@code chat}），超限额不调模型；</li>
 * <li><b>回复先过 {@link AiContentGuard#checkChatReply} 再返回</b>，空回复与提示词泄露一律拒。</li>
 * </ol>
 *
 * @author ai-sidebar
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiAssistantServiceImpl implements AiAssistantService {

	/** 提示词模板 id（{@code prompts/assistant-chat.md}） */
	private static final String PROMPT_CHAT = "assistant-chat";

	/** 项目授权级别：1 只读（与 AiAssistServiceImpl 同一口径） */
	private static final int ACCESS_LEVEL_VIEW = 1;

	/**
	 * 最多带多少条历史给模型：一轮问答 = 1 条，12 条 ≈ 最近 6 轮。
	 * 再多既贵又容易超出上下文窗口，而侧栏的问题大多是「接着上一句问」。
	 */
	private static final int MAX_HISTORY_TURNS = 12;

	/** 单条消息最多带多少字：整份答卷粘进来时不能让提示词无限膨胀 */
	private static final int MAX_TURN_CHARS = 4000;

	/** 题干最多带多少字进上下文（已经由 AiPageContext 再截一次，这里控制得更松一些） */
	private static final int MAX_QUESTION_TITLE_CHARS = 300;

	/**
	 * 对话温度：0.6 比出卷（0.4）活一点、比改题（0.7）稳一点。
	 * 太低会复读用户原话，太高容易答着答着跑题。
	 */
	private static final Double TEMPERATURE = Double.valueOf(0.6D);

	private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("MM-dd HH:mm");

	private final AiGateway aiGateway;

	private final PromptRegistry promptRegistry;

	private final AiUsageService aiUsageService;

	private final ProjectService projectService;

	private final ProjectPartnerService projectPartnerService;

	private final AnswerMapper answerMapper;

	private final AnswerAccessGuard answerAccessGuard;

	@Override
	public AiStatusView status() {
		AiReadiness readiness = aiGateway.readiness();
		AiStatusView view = new AiStatusView();
		view.setReady(Boolean.valueOf(readiness.isReady()));
		view.setReason(readiness.getReason());
		view.setModel(readiness.getModel());
		return view;
	}

	@Override
	public AiChatReply chat(AiChatRequest request) {
		if (request == null || CollectionUtils.isEmpty(request.getMessages())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先输入要问 AI 的问题");
		}
		List<AiChatTurn> history = sanitize(request.getMessages());
		if (history.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先输入要问 AI 的问题");
		}
		if (!history.get(history.size() - 1).isUser()) {
			// 最后一条是助手的回复说明前端没把这一问追加上，直接发给模型等于让它自问自答
			throw new ErrorCodeException(ErrorCode.ValidationError, "请把你的问题写在最后一条消息里再发送");
		}

		String userId = SecurityContextUtils.getUserId();
		ContextFacts facts = collectContext(request.getContext());
		List<AiChatTurn> turns = new ArrayList<>(history.size() + 1);
		turns.add(AiChatTurn.system(renderSystemPrompt(facts)));
		turns.addAll(history);

		AiCompletion completion = converse(turns, request.getModel(), userId);
		String reply;
		try {
			reply = AiContentGuard.checkChatReply(completion.getText());
		}
		catch (ErrorCodeException e) {
			// 模型已经烧了 token，只是内容不合规：记 rejected（用量照样算）
			record(userId, completion, AiUsage.STATUS_REJECTED, completion.getCostMs(), e.getMessage());
			throw e;
		}
		record(userId, completion, AiUsage.STATUS_OK, completion.getCostMs(), null);
		log.info("AI 对话: user={}, model={}, turns={}, promptTokens={}, completionTokens={}, hasContext={}", userId,
				completion.getModel(), Integer.valueOf(history.size()),
				Integer.valueOf(completion.getPromptTokens()), Integer.valueOf(completion.getCompletionTokens()),
				Boolean.valueOf(!facts.lines().isEmpty()));

		AiChatReply view = new AiChatReply();
		view.setReply(reply);
		view.setModel(completion.getModel());
		view.setPromptTokens(Integer.valueOf(completion.getPromptTokens()));
		view.setCompletionTokens(Integer.valueOf(completion.getCompletionTokens()));
		view.setTotalTokens(Integer.valueOf(completion.getTotalTokens()));
		view.setCostMs(Long.valueOf(completion.getCostMs()));
		view.setContextLabel(facts.label());
		return view;
	}

	/* ====== 历史消息 ====== */

	/**
	 * 只保留 user / assistant 两种角色，去掉空消息，截断超长内容，并只留最近 {@link #MAX_HISTORY_TURNS} 条。
	 * <p><b>system 一律丢弃</b>：否则在浏览器控制台里加一条 system 就能改写 AI 的行为。
	 */
	private List<AiChatTurn> sanitize(List<AiChatRequest.Message> messages) {
		List<AiChatTurn> turns = new ArrayList<>(messages.size());
		for (AiChatRequest.Message message : messages) {
			if (message == null) {
				continue;
			}
			String role = message.getRole() == null ? null : message.getRole().trim().toLowerCase();
			if (!AiChatTurn.ROLE_USER.equals(role) && !AiChatTurn.ROLE_ASSISTANT.equals(role)) {
				continue;
			}
			String content = message.getContent() == null ? "" : message.getContent().trim();
			if (!StringUtils.hasText(content)) {
				continue;
			}
			turns.add(new AiChatTurn(role, truncate(content, MAX_TURN_CHARS)));
		}
		if (turns.size() > MAX_HISTORY_TURNS) {
			return new ArrayList<>(turns.subList(turns.size() - MAX_HISTORY_TURNS, turns.size()));
		}
		return turns;
	}

	/* ====== 当前页面上下文 ====== */

	private String renderSystemPrompt(ContextFacts facts) {
		LinkedHashMap<String, String> vars = new LinkedHashMap<>();
		vars.put("context", AiPageContext.render(facts.lines()));
		return promptRegistry.render(PROMPT_CHAT, vars);
	}

	/**
	 * 按 id 查库补齐上下文。
	 *
	 * <p>为什么不信前端给的文案：试卷名与题干都会进系统提示，如果由前端直接给字符串，
	 * 任何人在控制台里改一句就能往提示词里塞指令。这里只信 id，文案一律查库。
	 */
	private ContextFacts collectContext(AiChatRequest.Context context) {
		LinkedHashMap<String, String> lines = new LinkedHashMap<>();
		List<String> labels = new ArrayList<>();
		if (context != null) {
			lines.put("路由", context.getRoute());
			lines.put("页面", context.getPage());
			ProjectView project = null;
			if (StringUtils.hasText(context.getProjectId())) {
				project = loadProject(context.getProjectId());
				String name = StringUtils.hasText(project.getName()) ? project.getName().trim() : "未命名";
				lines.put("试卷", describeProject(project, name));
				labels.add("试卷《" + name + "》");
				List<SurveySchema> questions = project.getSurvey() == null ? List.of()
						: SchemaHelper.flatSurveySchema(project.getSurvey());
				if (!questions.isEmpty()) {
					lines.put("题量", questions.size() + " 题");
				}
				appendQuestion(lines, labels, questions, context.getQuestionId());
			}
			if (StringUtils.hasText(context.getAnswerId())) {
				appendAnswer(lines, labels, context.getAnswerId());
			}
		}
		String label = labels.isEmpty() ? null : String.join(" · ", labels);
		return new ContextFacts(lines, label);
	}

	private ProjectView loadProject(String projectId) {
		ProjectView project = projectService.getProject(projectId);
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound, "项目不存在");
		}
		// 同一道闸门与 AI 改题一致：能看这份试卷的人才能让 AI 看见它
		if (projectPartnerService.accessLevel(project.getId()) < ACCESS_LEVEL_VIEW) {
			throw new AccessDeniedException("没有权限访问该项目");
		}
		return project;
	}

	private String describeProject(ProjectView project, String name) {
		StringBuilder text = new StringBuilder("《").append(name).append("》");
		if (project.getMode() != null) {
			text.append("（").append(modeLabel(project.getMode())).append("）");
		}
		if (Integer.valueOf(1).equals(project.getStatus())) {
			text.append("，已发布");
		}
		return text.toString();
	}

	private String modeLabel(ProjectModeEnum mode) {
		return switch (mode) {
			case exam -> "考试";
			case survey -> "问卷";
			case folder -> "文件夹";
		};
	}

	/** 当前题目：题号 + 题型 + 题干（题干会给模型看，所以先剥 HTML 再截断） */
	private void appendQuestion(LinkedHashMap<String, String> lines, List<String> labels, List<SurveySchema> questions,
			String questionId) {
		if (!StringUtils.hasText(questionId)) {
			return;
		}
		for (int index = 0; index < questions.size(); index++) {
			SurveySchema question = questions.get(index);
			if (question == null || !questionId.equals(question.getId())) {
				continue;
			}
			String title = truncate(question.getTitle() == null ? "" : question.getTitle().trim(),
					MAX_QUESTION_TITLE_CHARS);
			String type = question.getType() == null ? "未知题型" : question.getType().name();
			lines.put("当前题目", "第 " + (index + 1) + " 题（" + type + "）：" + (StringUtils.hasText(title) ? title : "（无题干）"));
			labels.add("第 " + (index + 1) + " 题");
			return;
		}
	}

	/** 当前答卷：第几次作答、什么时候交的、得了多少分（只给数字，不给学员姓名） */
	private void appendAnswer(LinkedHashMap<String, String> lines, List<String> labels, String answerId) {
		Answer answer = answerMapper.selectById(answerId);
		if (answer == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "答卷不存在或已删除");
		}
		// 行级权限：本人、项目所有者/协作者、管理员可看（与批改建议同一套规则）
		answerAccessGuard.assertAnswerAccess(answer);
		StringBuilder text = new StringBuilder();
		int attempt = answer.getAttemptNo() == null ? 0 : answer.getAttemptNo().intValue();
		text.append("第 ").append(attempt + 1).append(" 次作答");
		if (answer.getCreateAt() != null) {
			text.append("，提交于 ")
					.append(TIME_FORMAT.format(Instant.ofEpochMilli(answer.getCreateAt().getTime())
							.atZone(ZoneId.systemDefault()).toLocalDateTime()));
		}
		if (answer.getExamScore() != null) {
			text.append("，得分 ").append(formatScore(answer.getExamScore().doubleValue())).append(" 分");
		}
		if (StringUtils.hasText(answer.getGradeStatus())) {
			text.append("，批改状态 ").append(gradeLabel(answer.getGradeStatus()));
		}
		lines.put("当前答卷", text.toString());
		labels.add("第 " + (attempt + 1) + " 次作答的答卷");
	}

	private String gradeLabel(String gradeStatus) {
		return switch (gradeStatus) {
			case "none" -> "无需批改";
			case "pending" -> "待批改";
			case "graded" -> "已批改";
			default -> gradeStatus;
		};
	}

	/* ====== 调用与记账 ====== */

	/** 调模型（含限额闸门与失败记账）；成功时的记账由调用方在校验通过后做 */
	private AiCompletion converse(List<AiChatTurn> turns, String model, String userId) {
		long start = System.currentTimeMillis();
		try {
			aiUsageService.assertQuota(userId);
		}
		catch (ErrorCodeException e) {
			// 被限额拦下也要记账，否则「今天怎么没额度」查不出来
			record(userId, null, AiUsage.STATUS_REJECTED, System.currentTimeMillis() - start, e.getMessage());
			throw e;
		}
		try {
			return aiGateway.completeConversation(
					AiConversation.builder().turns(turns).model(model).temperature(TEMPERATURE).build());
		}
		catch (ErrorCodeException e) {
			record(userId, null, AiUsage.STATUS_REJECTED, System.currentTimeMillis() - start, e.getMessage());
			throw e;
		}
		catch (RuntimeException e) {
			record(userId, null, AiUsage.STATUS_ERROR, System.currentTimeMillis() - start, messageOf(e));
			throw e;
		}
	}

	private void record(String userId, AiCompletion completion, String status, long costMs, String error) {
		if (completion == null) {
			aiUsageService.record(userId, AiUsageService.SCENE_CHAT, null, 0, 0, costMs, status, error);
			return;
		}
		aiUsageService.record(userId, AiUsageService.SCENE_CHAT, completion.getModel(), completion.getPromptTokens(),
				completion.getCompletionTokens(), costMs, status, error);
	}

	private static String messageOf(Throwable e) {
		if (e == null) {
			return null;
		}
		return StringUtils.hasText(e.getMessage()) ? e.getMessage() : e.getClass().getSimpleName();
	}

	private static String truncate(String text, int max) {
		if (text == null) {
			return null;
		}
		return text.length() <= max ? text : text.substring(0, max) + "…";
	}

	private static String formatScore(double value) {
		return value == Math.rint(value) ? String.valueOf((long) value)
				: String.valueOf(Math.round(value * 100D) / 100D);
	}

	/** 上下文facts：给提示词用的行 + 给用户看的摘要 */
	private record ContextFacts(LinkedHashMap<String, String> lines, String label) {
	}

}
