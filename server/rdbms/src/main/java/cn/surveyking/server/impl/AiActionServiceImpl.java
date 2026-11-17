package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiPageContext;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.ai.domain.AiChatAction;
import cn.surveyking.server.ai.domain.AiChatRequest;
import cn.surveyking.server.domain.dto.AiGradeBatchRequest;
import cn.surveyking.server.domain.dto.AiGradeBatchView;
import cn.surveyking.server.domain.dto.AiReportSummaryRequest;
import cn.surveyking.server.domain.dto.AiReportSummaryView;
import cn.surveyking.server.domain.dto.AiUsageView;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.RepoView;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.service.AiActionService;
import cn.surveyking.server.service.AiAssistService;
import cn.surveyking.server.service.AiGradeBatchService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.AnswerGradeService;
import cn.surveyking.server.service.RepoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 把老师的一句话翻译成系统动作。
 *
 * <p>设计取舍：
 * <ul>
 * <li><b>先识别、再执行、最后才聊天</b>：模型在这里只做「分类 + 抽参数」，不做业务判断；
 * 每个动作的权限、数据范围、可写条件全在具体服务里判（例如批量批改的闸门在
 * {@code AiGradeBatchServiceImpl}）；</li>
 * <li><b>识别失败不能挡聊天</b>：模型不返回合法 JSON 时直接放弃，回退成普通问答；</li>
 * <li><b>不花冤枉钱</b>：没有上下文、也不像指令的消息（{@link #ACTION_HINTS} 全不命中）直接跳过识别；</li>
 * <li><b>写操作只有一条</b>：批改。其余动作只打开对应工具，真正写库仍由老师在界面上确认。</li>
 * </ul>
 *
 * @author ai-actions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiActionServiceImpl implements AiActionService {

	private static final String PROMPT_INTENT = "assistant-intent";

	/** 允许从模型 args 里透传的参数（只放 id、数字、枚举与用户原话要点） */
	private static final List<String> ARG_WHITELIST = List.of("maxAnswers", "questionCount", "difficulties", "chapters",
			"repoIds", "points", "audience", "classIds");

	/**
	 * 便宜的门槛：消息里出现这些字才值得花一次模型调用去做意图识别。
	 * 宁可漏判（退化成普通聊天，用户再点一下工具入口），也不要为每句闲聊多烧一次调用。
	 */
	private static final List<String> ACTION_HINTS = List.of("批", "出题", "组卷", "抽题", "体检", "检查", "质检", "通知",
			"公告", "额度", "还剩", "配额", "整理", "推荐", "重练", "错题", "统计", "进度", "没交", "没批", "改题", "改写",
			"考得", "分析");

	private final AiAssistSupport support;

	private final AiGradeBatchService aiGradeBatchService;

	private final AiAssistService aiAssistService;

	private final AnswerGradeService answerGradeService;

	private final AiUsageService aiUsageService;

	private final RepoService repoService;

	@Override
	public AiChatAction handle(String message, AiChatRequest.Context context, String userId, boolean firstTurn) {
		if (!StringUtils.hasText(message) || !shouldTry(message, context, firstTurn)) {
			return null;
		}
		Map<String, String> vars = new LinkedHashMap<>();
		vars.put("context", AiPageContext.render(contextLines(context)));
		vars.put("scope", describeScope(context));
		AiRequest request = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_INTENT, vars))
				.userPrompt(AiAssistSupport.oneLine(message, 500)).temperature(Double.valueOf(0D)).build();
		JsonNode root;
		try {
			root = support.json().readTree(support.call(AiUsageService.SCENE_CHAT_INTENT, userId, request, true).getText());
		}
		catch (Exception e) {
			// 识别失败不该挡住聊天：这里只记日志，交给上层走普通问答
			log.warn("AI 意图识别失败，按普通问答处理：{}", e.getMessage());
			return null;
		}
		String action = root == null ? "none" : root.path("action").asText("none");
		JsonNode args = root == null ? null : root.path("args");
		try {
			return switch (action) {
				case "grade_pending" -> gradePending(context, args);
				case "paper_pick" -> openTool("paper_pick", context, args, "从题库抽题组卷");
				case "paper_check" -> openTool("paper_check", context, args, "试卷质检");
				case "repo_audit" -> openTool("repo_audit", context, args, "题库体检");
				case "recommend_practice" -> openTool("recommend_practice", context, args, "错题重练");
				case "notice_draft" -> noticeDraft(context, args);
				case "rewrite_question" -> openTool("rewrite_question", context, args, "AI 改题");
				case "report_summary" -> reportSummary(context);
				case "answer_query" -> answerQuery(context);
				case "usage_query" -> usageQuery();
				default -> null;
			};
		}
		catch (RuntimeException e) {
			// 动作执行不了（没权限、没有待批答卷…）也要给用户一句人话，而不是静默变回聊天
			log.info("AI 动作未执行: action={}, reason={}", action, e.getMessage());
			return info("动作没执行", e.getMessage() == null ? "这个操作现在做不了。" : e.getMessage());
		}
	}

	/* ====== 动作：批改 ====== */

	private AiChatAction gradePending(AiChatRequest.Context context, JsonNode args) {
		String projectId = context == null ? null : context.getProjectId();
		if (!StringUtils.hasText(projectId)) {
			return info("先打开一份试卷", "我没有看到你正在看哪份试卷。进入「考试/问卷」打开要批改的卷子，再跟我说一次。");
		}
		if (!SecurityContextUtils.isAdmin() && !SecurityContextUtils.hasAuthority("answer:grade")) {
			return info("没有批改权限", "当前账号没有「批改答卷」权限，让管理员在「权限配置」里给角色勾上「批改答卷」再来。");
		}
		String classId = context.getClassId();
		AiGradeBatchRequest request = new AiGradeBatchRequest();
		request.setProjectId(projectId);
		request.setClassId(StringUtils.hasText(classId) ? classId : null);
		if (args != null && args.path("maxAnswers").isNumber()) {
			request.setMaxAnswers(Integer.valueOf(Math.max(1, args.path("maxAnswers").asInt(30))));
		}
		// 先数一下会批多少：这段数字是老师判断「要不要现在批」的唯一依据
		long pending = countAnswers(projectId, classId, "pending");
		if (pending <= 0) {
			return info("没有待批改的答卷", "这份试卷的主观题都已经批完了，没有需要 AI 补分的答卷。");
		}
		String jobId = aiGradeBatchService.start(request);
		AiChatAction action = new AiChatAction();
		action.setKey("grade_batch");
		action.setStatus("running");
		action.setTitle("正在批改待批改的答卷");
		action.setSummary("已开始：" + (StringUtils.hasText(classId) ? "本班" : "这份试卷") + "还有 " + pending
				+ " 份答卷没批。只给「还没给分」的主观题补分，已经有分的一律跳过；批完可以一键撤销，低置信度的题会单独列出来让你复核。");
		action.setJobId(jobId);
		action.setLink("/survey/" + projectId + "/data");
		return action;
	}

	/* ====== 动作：打开工具（不写库） ====== */

	private AiChatAction openTool(String tool, AiChatRequest.Context context, JsonNode args, String title) {
		String projectId = context == null ? null : context.getProjectId();
		String repoId = context == null ? null : context.getRepoId();
		if (("paper_pick".equals(tool) || "paper_check".equals(tool) || "recommend_practice".equals(tool)
				|| "rewrite_question".equals(tool)) && !StringUtils.hasText(projectId)) {
			return info("先打开一份试卷", "这些操作要在试卷里做：进入「考试/问卷」打开卷子，再跟我说一次。");
		}
		if ("repo_audit".equals(tool) && !StringUtils.hasText(repoId)) {
			return info("先打开一个题库", "体检要针对具体题库：进入「题库中心」打开题库题目页，再跟我说一次。");
		}
		AiChatAction action = new AiChatAction();
		action.setKey("open_tool");
		action.setStatus("info");
		action.setTitle("已为你打开「" + title + "」");
		action.setSummary("在打开的面板里确认参数后点开始；AI 只给建议，写库前你还能改。");
		action.setTool(tool);
		action.setParams(sanitizeArgs(args));
		switch (tool) {
			case "paper_pick" -> {
				action.setLink("/survey/" + projectId + "/edit?ai=pick");
				action.setSummary("已打开组卷面板：选好题库、题量与题型配比就能从题库抽题，抽完先预览再采纳。");
			}
			case "paper_check" -> {
				action.setLink("/survey/" + projectId + "/edit?ai=check");
				action.setSummary("已打开质检面板：检查重复题、缺分值、难度分布与考点覆盖。");
			}
			case "repo_audit" -> {
				action.setLink("/repo/" + repoId + "/questions/normal?ai=audit");
				action.setSummary("已打开题库体检：找重复题、缺解析、缺难度章节标签，勾选后批量写回。");
			}
			case "recommend_practice" -> {
				action.setLink("/survey/" + projectId + "/report?ai=recommend");
				action.setSummary("已打开错题重练：按这场考试错得最多的考点，从题库再抽一组题。");
			}
			case "rewrite_question" -> {
				String questionId = context == null ? null : context.getQuestionId();
				action.setLink("/survey/" + projectId + "/edit?ai=rewrite"
						+ (StringUtils.hasText(questionId) ? "&questionId=" + questionId : ""));
				action.setSummary("已打开改题面板：选风格后给 3 条改写建议，采纳前你还能改。");
			}
			default -> {
			}
		}
		return action;
	}

	private AiChatAction noticeDraft(AiChatRequest.Context context, JsonNode args) {
		AiChatAction action = new AiChatAction();
		action.setKey("open_tool");
		action.setStatus("info");
		action.setTitle("已打开公告编辑器");
		action.setSummary("把要点补成一条规范通知草稿，改完再发布（老师只能发自己带的班，全站公告需要管理员权限）。");
		action.setTool("notice_draft");
		Map<String, Object> params = new LinkedHashMap<>();
		if (args != null) {
			String points = args.path("points").asText(null);
			String audience = args.path("audience").asText(null);
			if (StringUtils.hasText(points)) {
				params.put("points", AiAssistSupport.oneLine(points, 500));
			}
			if (StringUtils.hasText(audience)) {
				params.put("audience", audience);
			}
		}
		action.setParams(params);
		action.setLink("/system/notice?ai=draft");
		return action;
	}

	/* ====== 动作：只读问答 ====== */

	private AiChatAction reportSummary(AiChatRequest.Context context) {
		String projectId = context == null ? null : context.getProjectId();
		if (!StringUtils.hasText(projectId)) {
			return info("先打开一份试卷", "进入「学情报表」或「试卷概览」再问我，我才能读到这次考试的统计数字。");
		}
		AiReportSummaryRequest request = new AiReportSummaryRequest();
		request.setProjectId(projectId);
		request.setClassId(StringUtils.hasText(context.getClassId()) ? context.getClassId() : null);
		AiReportSummaryView view = aiAssistService.summarizeReport(request);
		AiChatAction action = info("学情分析", view == null ? null : view.getText());
		action.setLink("/survey/" + projectId + "/report");
		return action;
	}

	private AiChatAction answerQuery(AiChatRequest.Context context) {
		String projectId = context == null ? null : context.getProjectId();
		if (!StringUtils.hasText(projectId)) {
			return info("先打开一份试卷", "进入「考试/问卷」打开卷子，我才能告诉你批改进度。");
		}
		String classId = context.getClassId();
		long pending = countAnswers(projectId, classId, "pending");
		long graded = countAnswers(projectId, classId, "graded");
		long total = countAnswers(projectId, classId, null);
		StringBuilder text = new StringBuilder();
		text.append(StringUtils.hasText(classId) ? "本班" : "这份试卷").append("共 ").append(total).append(" 份正式答卷：已批 ")
				.append(graded).append(" 份，待批 ").append(pending).append(" 份。");
		if (pending > 0) {
			text.append("要我直接批掉吗？说一声「把这些没批的批了」就行。");
		}
		AiChatAction action = info("批改进度", text.toString());
		action.setLink("/survey/" + projectId + "/data");
		return action;
	}

	private AiChatAction usageQuery() {
		AiUsageView usage = aiUsageService.today();
		StringBuilder text = new StringBuilder();
		text.append("今日已用 ").append(formatNumber(usage == null ? null : usage.getUserTokens())).append(" tokens（我）/ ")
				.append(formatNumber(usage == null ? null : usage.getDailyTokens())).append(" tokens（全站）。上限：我 ")
				.append(limitText(usage == null ? null : usage.getUserLimit())).append("，全站 ")
				.append(limitText(usage == null ? null : usage.getDailyLimit())).append("。额度用完次日自动恢复。");
		return info("AI 额度", text.toString());
	}

	/* ====== 上下文 / 工装 ====== */

	/**
	 * 值不值得做一次意图识别：消息里出现动作关键词，或者这是本轮第一句且页面有可操作对象。
	 *
	 * <p>为什么限制「第一句」：上下文里只要有试卷，后面每句追问（「为什么」「那第 3 题呢」）
	 * 都会命中「有上下文」；每句都多花一次模型调用做识别，纯属把钱花在确认「这不是指令」上。
	 */
	private boolean shouldTry(String message, AiChatRequest.Context context, boolean firstTurn) {
		for (String hint : ACTION_HINTS) {
			if (message.contains(hint)) {
				return true;
			}
		}
		if (!firstTurn || context == null) {
			return false;
		}
		return StringUtils.hasText(context.getProjectId()) || StringUtils.hasText(context.getClassId())
				|| StringUtils.hasText(context.getRepoId());
	}

	private Map<String, String> contextLines(AiChatRequest.Context context) {
		Map<String, String> lines = new LinkedHashMap<>();
		if (context == null) {
			return lines;
		}
		if (StringUtils.hasText(context.getPage())) {
			lines.put("页面", context.getPage());
		}
		if (StringUtils.hasText(context.getProjectId())) {
			lines.put("试卷 id", context.getProjectId());
		}
		if (StringUtils.hasText(context.getClassId())) {
			lines.put("班级 id", context.getClassId());
		}
		if (StringUtils.hasText(context.getRepoId())) {
			lines.put("题库 id", context.getRepoId());
		}
		if (StringUtils.hasText(context.getQuestionId())) {
			lines.put("题目 id", context.getQuestionId());
		}
		return lines;
	}

	/** 给模型看「现在能操作什么」：名称 + 规模，比一串 id 有用得多 */
	private String describeScope(AiChatRequest.Context context) {
		StringBuilder text = new StringBuilder();
		if (context != null && StringUtils.hasText(context.getProjectId())) {
			try {
				ProjectView project = support.readableProject(context.getProjectId());
				int questions = SchemaHelper.flatSurveySchema(project.getSurvey()) == null ? 0
						: SchemaHelper.flatSurveySchema(project.getSurvey()).size();
				text.append("- 当前试卷：").append(project.getName() == null ? "未命名" : project.getName()).append("（")
						.append(questions).append(" 题）\n");
				text.append("- 待批改答卷：").append(countAnswers(project.getId(), null, "pending")).append(" 份\n");
			}
			catch (RuntimeException e) {
				log.debug("AI 意图：读项目失败 {}", e.getMessage());
			}
		}
		if (context != null && StringUtils.hasText(context.getClassId())) {
			text.append("- 当前班级 id：").append(context.getClassId()).append("\n");
		}
		if (context != null && StringUtils.hasText(context.getRepoId())) {
			try {
				RepoView repo = repoService.getRpo(context.getRepoId());
				text.append("- 当前题库：").append(repo == null || repo.getName() == null ? "未命名" : repo.getName())
						.append('\n');
			}
			catch (RuntimeException e) {
				log.debug("AI 意图：读题库失败 {}", e.getMessage());
			}
		}
		return text.length() == 0 ? "（没有可操作的对象，除 usage_query / notice_draft 外只返回 none）" : text.toString();
	}

	/**
	 * 只接收白名单里的参数，且只保留标量。
	 *
	 * <p>为什么不用「遍历所有 key」：模型偶尔会自己发明字段（比如把整段题干塞进 args），
	 * 白名单能让「未知参数」直接消失，而不是被当成正经参数传给前端去预填。
	 */
	private Map<String, Object> sanitizeArgs(JsonNode args) {
		Map<String, Object> params = new LinkedHashMap<>();
		if (args == null || !args.isObject()) {
			return params;
		}
		for (String key : ARG_WHITELIST) {
			JsonNode value = args.path(key);
			if (value == null || value.isMissingNode() || value.isNull()) {
				continue;
			}
			if (value.isNumber()) {
				params.put(key, Integer.valueOf(value.asInt()));
			}
			else if (value.isBoolean()) {
				params.put(key, Boolean.valueOf(value.asBoolean()));
			}
			else if (value.isTextual()) {
				params.put(key, AiAssistSupport.oneLine(value.asText(), 200));
			}
			else if (value.isArray()) {
				List<String> items = new java.util.ArrayList<>();
				for (JsonNode item : value) {
					if (item.isTextual()) {
						items.add(AiAssistSupport.oneLine(item.asText(), 60));
					}
				}
				if (!items.isEmpty()) {
					params.put(key, items);
				}
			}
		}
		return params;
	}

	private long countAnswers(String projectId, String classId, String gradeStatus) {
		try {
			// 先过项目只读闸门：统计数字也是信息，不能让「拿别人的 projectId 问一句」拿到
			support.assertProjectReadable(projectId);
			AnswerQuery query = new AnswerQuery();
			query.setProjectId(projectId);
			query.setClassId(StringUtils.hasText(classId) ? classId : null);
			query.setGradeStatus(gradeStatus);
			query.setCurrent(Integer.valueOf(1));
			query.setPageSize(Integer.valueOf(1));
			PaginationResponse<AnswerView> page = answerGradeService.listPending(query);
			return page == null || page.getTotal() == null ? 0L : page.getTotal().longValue();
		}
		catch (RuntimeException e) {
			log.debug("AI 意图：统计答卷失败 {}", e.getMessage());
			return 0L;
		}
	}

	private AiChatAction info(String title, String summary) {
		AiChatAction action = new AiChatAction();
		action.setKey("info");
		action.setStatus("info");
		action.setTitle(title);
		action.setSummary(summary);
		return action;
	}

	private static String formatNumber(Long value) {
		return value == null ? "0" : String.valueOf(value.longValue());
	}

	private static String limitText(Integer limit) {
		return limit == null || limit.intValue() <= 0 ? "不限" : String.valueOf(limit.intValue());
	}

}
