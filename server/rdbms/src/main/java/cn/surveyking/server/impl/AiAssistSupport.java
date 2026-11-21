package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiGateway;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.ai.core.PromptRegistry;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.domain.dto.AiPaperJobView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.AiUsage;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;



















@Service
@RequiredArgsConstructor
@Slf4j
public class AiAssistSupport {


	public static final int ACCESS_LEVEL_VIEW = 1;


	public static final int ACCESS_LEVEL_EDIT = 2;


	public static final int MAX_PROMPT_TEXT_CHARS = 2000;

	private final AiGateway aiGateway;

	private final PromptRegistry promptRegistry;

	private final AiUsageService aiUsageService;

	private final ObjectMapper objectMapper;

	private final ProjectService projectService;

	private final ProjectPartnerService projectPartnerService;

	/** 提示词注册表（场景实现里直接渲染模板，避免每个类自己 new） */
	public PromptRegistry prompts() {
		return promptRegistry;
	}

	public ObjectMapper json() {
		return objectMapper;
	}



	/**

	 *
	 * @param scene 场景（{@link AiUsageService} 里的 SCENE_*）
	 * @param userId 调用人（后台线程里没有登录态，必须显式传）
	 * @param request 提示词 / 温度；后台任务请用 {@code AiRequest.builder().background(true)}
	 * @param json true 时剥掉 JSON 围栏（模型爱写 &#96;&#96;&#96;json）
	 */
	public AiCompletion call(String scene, String userId, AiRequest request, boolean json) {
		long start = System.currentTimeMillis();
		try {
			aiUsageService.assertQuota(userId);
		}
		catch (ErrorCodeException e) {
			recordUsage(userId, scene, null, AiUsage.STATUS_REJECTED, System.currentTimeMillis() - start,
					e.getMessage());
			throw e;
		}
		try {
			AiCompletion completion = json ? aiGateway.completeJson(request) : aiGateway.complete(request);
			recordUsage(userId, scene, completion, AiUsage.STATUS_OK, completion.getCostMs(), null);
			return completion;
		}
		catch (ErrorCodeException e) {
			recordUsage(userId, scene, null, AiUsage.STATUS_REJECTED, System.currentTimeMillis() - start,
					e.getMessage());
			throw e;
		}
		catch (RuntimeException e) {
			recordUsage(userId, scene, null, AiUsage.STATUS_ERROR, System.currentTimeMillis() - start,
					messageOf(e));
			throw e;
		}
	}

	/** 记一笔用量（拿不到 completion 时按 0 token 记） */
	public void recordUsage(String userId, String scene, AiCompletion completion, String status, long costMs,
			String error) {
		if (completion == null) {
			aiUsageService.record(userId, scene, null, 0, 0, costMs, status, error);
			return;
		}
		aiUsageService.record(userId, scene, completion.getModel(), completion.getPromptTokens(),
				completion.getCompletionTokens(), costMs, status, error);
	}

	/** 限额闸门（不调模型时也要先判一次：例如批量任务在提交时就该拦住） */
	public void assertQuota(String userId) {
		aiUsageService.assertQuota(userId);
	}



	/** 项目只读闸门：管理员、所有者、任意级别协作者都能过（0 表示完全没有授权） */
	public void assertProjectReadable(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择项目");
		}
		if (projectPartnerService.accessLevel(projectId) < ACCESS_LEVEL_VIEW) {
			throw new AccessDeniedException("没有权限访问该项目");
		}
	}

	/** 项目可编辑闸门：写项目 schema（采纳题目、追加重练题）前必须过 */
	public void assertProjectEditable(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择项目");
		}
		if (projectPartnerService.accessLevel(projectId) < ACCESS_LEVEL_EDIT) {
			throw new AccessDeniedException("没有编辑该项目的权限");
		}
	}

	/** 读项目（找不到时抛中文 404） */
	public ProjectView project(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择项目");
		}
		ProjectView project = projectService.getProject(projectId);
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound, "项目不存在");
		}
		return project;
	}

	/** 读项目并过只读闸门 */
	public ProjectView readableProject(String projectId) {
		ProjectView project = project(projectId);
		assertProjectReadable(projectId);
		return project;
	}

	/** 项目里所有题目（扁平，null 安全） */
	public List<SurveySchema> questions(ProjectView project) {
		if (project == null || project.getSurvey() == null) {
			return List.of();
		}
		List<SurveySchema> flat = SchemaHelper.flatSurveySchema(project.getSurvey());
		return flat == null ? List.of() : flat;
	}



	/** 题量 / 总分 / 题型分布：预览表与前端展示共用同一份口径 */
	public AiPaperJobView.Stats summarize(List<SurveySchema> questions) {
		AiPaperJobView.Stats stats = new AiPaperJobView.Stats();
		LinkedHashMap<String, Integer> typeCount = new LinkedHashMap<>();
		LinkedHashMap<String, Double> typeScore = new LinkedHashMap<>();
		double total = 0D;
		int count = 0;
		if (!CollectionUtils.isEmpty(questions)) {
			for (SurveySchema question : questions) {
				if (question == null) {
					continue;
				}
				count++;
				String type = question.getType() == null ? "Unknown" : question.getType().name();
				typeCount.merge(type, Integer.valueOf(1), (left, right) -> Integer.valueOf(left.intValue() + 1));
				double score = question.getAttribute() == null || question.getAttribute().getExamScore() == null ? 0D
						: question.getAttribute().getExamScore().doubleValue();
				total += score;
				typeScore.merge(type, Double.valueOf(score), (left, right) -> Double.valueOf(left.doubleValue() + right.doubleValue()));
			}
		}
		stats.setQuestionCount(Integer.valueOf(count));
		stats.setTotalScore(Double.valueOf(total));
		stats.setTypeCount(typeCount);
		stats.setTypeScore(typeScore);
		return stats;
	}

	/** 读 JSON（读不出时给中文原因，别把 Jackson 的英文栈信息弹给老师） */
	public JsonNode readJson(String json, String scene) {
		try {
			return objectMapper.readTree(json);
		}
		catch (Exception e) {
			throw new ErrorCodeException(ErrorCode.ValidationError, scene + "结果解析失败：" + messageOf(e) + "，请重试");
		}
	}

	/** 分数统一保留一位小数（1.0 显示成 1） */
	public static String formatScore(double value) {
		DecimalFormat format = new DecimalFormat("0.#");
		return format.format(value);
	}

	/** 压成一行并截断（进日志 / 提示词前都用它） */
	public static String oneLine(String text, int max) {
		if (!StringUtils.hasText(text)) {
			return "";
		}
		String value = text.replaceAll("\\s+", " ").trim();
		return value.length() <= max ? value : value.substring(0, max) + "…";
	}

	/** 题干去标签后截断：题库里题干带 HTML，提示词里不需要标签 */
	public static String plainTitle(String title, int max) {
		String text = SchemaHelper.trimHtmlTag(title);
		return oneLine(text == null ? "" : text, max);
	}

	public static String messageOf(Throwable e) {
		if (e == null) {
			return "未知错误";
		}
		String message = e.getMessage();
		return StringUtils.hasText(message) ? message : e.getClass().getSimpleName();
	}

	public static String newId() {
		return UUID.randomUUID().toString().replace("-", "");
	}

	/** 给前端摘要用的「第 N 题」列表，最多列 {@code max} 个，超出写「等 N 题」 */
	public static String joinTitles(List<String> titles, int max) {
		if (CollectionUtils.isEmpty(titles)) {
			return "";
		}
		List<String> trimmed = new ArrayList<>();
		for (int index = 0; index < titles.size() && index < max; index++) {
			String title = oneLine(titles.get(index), 30);
			if (StringUtils.hasText(title)) {
				trimmed.add("「" + title + "」");
			}
		}
		String text = String.join("、", trimmed);
		if (titles.size() > max) {
			text = text + " 等 " + titles.size() + " 题";
		}
		return text;
	}

}
