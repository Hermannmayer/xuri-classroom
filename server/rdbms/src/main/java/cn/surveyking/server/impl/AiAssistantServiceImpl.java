package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiChatTurn;
import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiContentGuard;
import cn.surveyking.server.ai.core.AiConversation;
import cn.surveyking.server.ai.core.AiGateway;
import cn.surveyking.server.ai.core.AiPageContext;
import cn.surveyking.server.ai.core.AiReadiness;
import cn.surveyking.server.ai.core.PromptRegistry;
import cn.surveyking.server.ai.domain.AiChatAction;
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
import cn.surveyking.server.domain.dto.SystemInfo;
import cn.surveyking.server.domain.model.AiUsage;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.service.AiActionService;
import cn.surveyking.server.service.AiAssistantService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.SystemService;
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
















@Service
@RequiredArgsConstructor
@Slf4j
public class AiAssistantServiceImpl implements AiAssistantService {


	private static final String PROMPT_CHAT = "assistant-chat";


	private static final int ACCESS_LEVEL_VIEW = 1;





	private static final int DEFAULT_MAX_HISTORY_TURNS = AiUsageService.DEFAULT_MAX_CHAT_TURNS;


	private static final int DEFAULT_MAX_TURN_CHARS = AiUsageService.DEFAULT_MAX_TURN_CHARS;


	private static final int MAX_QUESTION_TITLE_CHARS = 300;





	private static final Double TEMPERATURE = Double.valueOf(0.6D);

	private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("MM-dd HH:mm");

	private final AiGateway aiGateway;

	private final PromptRegistry promptRegistry;

	private final AiUsageService aiUsageService;

	private final ProjectService projectService;

	private final ProjectPartnerService projectPartnerService;

	private final AnswerMapper answerMapper;

	private final AnswerAccessGuard answerAccessGuard;


	private final AiActionService aiActionService;


	private final SystemService systemService;

	@Override
	public AiStatusView status() {
		AiReadiness readiness = aiGateway.readiness();
		AiStatusView view = new AiStatusView();

		view.setEnabled(Boolean.valueOf(aiGateway.isEnabled()));
		view.setReady(Boolean.valueOf(readiness.isReady()));
		view.setReason(readiness.getReason());
		view.setModel(readiness.getModel());
		view.setSupportsImage(Boolean.valueOf(readiness.isSupportsImage()));
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

			throw new ErrorCodeException(ErrorCode.ValidationError, "请把你的问题写在最后一条消息里再发送");
		}

		String userId = SecurityContextUtils.getUserId();
		ContextFacts facts = collectContext(request.getContext());



		String lastMessage = history.get(history.size() - 1).content();

		AiChatAction action = aiActionService.handle(lastMessage, request.getContext(), userId, history.size() == 1);
		if (action != null) {
			AiChatReply acted = new AiChatReply();
			acted.setReply(composeActionReply(action));
			acted.setContextLabel(facts.label());
			acted.setAction(action);
			log.info("AI 对话触发动作: user={}, key={}, tool={}, jobId={}", userId, action.getKey(), action.getTool(),
					action.getJobId());
			return acted;
		}

		List<AiChatTurn> turns = new ArrayList<>(history.size() + 1);
		turns.add(AiChatTurn.system(renderSystemPrompt(facts)));
		turns.addAll(history);

		AiCompletion completion = converse(turns, request.getModel(), userId);
		String reply;
		try {
			reply = AiContentGuard.checkChatReply(completion.getText());
		}
		catch (ErrorCodeException e) {

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



	/** 只保留 user / assistant 两种角色，去掉空消息，截断超长内容，并只留最近 #MAX_HISTORY_TURNS 条 */
	private List<AiChatTurn> sanitize(List<AiChatRequest.Message> messages) {
		int maxTurns = configuredMaxTurns();
		int maxChars = configuredMaxChars();
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
			turns.add(new AiChatTurn(role, truncate(content, maxChars)));
		}
		if (turns.size() > maxTurns) {
			return new ArrayList<>(turns.subList(turns.size() - maxTurns, turns.size()));
		}
		return turns;
	}

	/** 一次对话最多带多少条历史（系统设置可改，缺省 20；夹到 2~100，别让 0 把 AI 锁死） */
	private int configuredMaxTurns() {
		SystemInfo.AiSetting setting = systemService.getSystemAiSetting();
		Integer configured = setting == null ? null : setting.getMaxChatTurns();
		if (configured == null) {
			return DEFAULT_MAX_HISTORY_TURNS;
		}
		return Math.max(2, Math.min(100, configured.intValue()));
	}

	/** 单条消息最多多少字（系统设置可改，缺省 4000；夹到 200~20000） */
	private int configuredMaxChars() {
		SystemInfo.AiSetting setting = systemService.getSystemAiSetting();
		Integer configured = setting == null ? null : setting.getMaxTurnChars();
		if (configured == null) {
			return DEFAULT_MAX_TURN_CHARS;
		}
		return Math.max(200, Math.min(20000, configured.intValue()));
	}

	/** 动作结果 → 一句话正文 */
	private String composeActionReply(AiChatAction action) {
		StringBuilder text = new StringBuilder();
		if (StringUtils.hasText(action.getTitle())) {
			text.append(action.getTitle()).append('。');
		}
		if (StringUtils.hasText(action.getSummary())) {
			text.append(action.getSummary());
		}
		if (StringUtils.hasText(action.getTool()) || StringUtils.hasText(action.getJobId())) {
			text.append("\n（这一步是我替你做的，结果都在下面的卡片里，可以点开确认或撤销。）");
		}
		return text.length() == 0 ? "好的。" : text.toString();
	}

	/** ====== 当前页面上下文 ====== */

	private String renderSystemPrompt(ContextFacts facts) {
		LinkedHashMap<String, String> vars = new LinkedHashMap<>();
		vars.put("context", AiPageContext.render(facts.lines()));
		return promptRegistry.render(PROMPT_CHAT, vars);
	}

	/** 按 id 查库补齐上下文 */
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

			if (StringUtils.hasText(context.getClassId())) {
				lines.put("班级", "当前按班级筛选（id " + AiAssistSupport.oneLine(context.getClassId(), 40) + "）");
				labels.add("按班级筛选");
			}
			if (StringUtils.hasText(context.getRepoId())) {
				lines.put("题库", "当前在题库题目页（id " + AiAssistSupport.oneLine(context.getRepoId(), 40) + "）");
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



	/** 调模型（含限额闸门与失败记账）；成功时的记账由调用方在校验通过后做 */
	private AiCompletion converse(List<AiChatTurn> turns, String model, String userId) {
		long start = System.currentTimeMillis();
		try {
			aiUsageService.assertQuota(userId);
		}
		catch (ErrorCodeException e) {

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


	private record ContextFacts(LinkedHashMap<String, String> lines, String label) {
	}

}
