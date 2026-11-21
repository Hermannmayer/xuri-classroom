package cn.surveyking.server.mcp;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.DownloadQuery;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.ProjectStatusRequest;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.ReportData;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.impl.AnswerAccessGuard;
import cn.surveyking.server.service.AnswerPdfJobService;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import jakarta.validation.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
















@Slf4j
@Component
@RequiredArgsConstructor
public class McpTools {


	static final int STAT_MAX_ANSWERS = 5000;


	private static final double PASS_RATE = 0.6D;

	private final ProjectService projectService;

	private final ReportService reportService;

	private final AnswerService answerService;

	private final AnswerPdfJobService answerPdfJobService;

	private final ClassService classService;








	private final AnswerAccessGuard answerAccessGuard;



	/** 真正的闸门仍然是各方法上的 @PreAuthorize */
	public Map<String, Object> capabilities(McpCaller caller) {
		Map<String, Object> result = new LinkedHashMap<>();
		Map<String, Object> token = new LinkedHashMap<>();
		token.put("id", caller == null ? null : caller.tokenId());
		token.put("name", caller == null ? null : caller.tokenName());
		token.put("scopes", caller == null ? List.of() : caller.scopes());
		result.put("token", token);

		Map<String, Object> user = new LinkedHashMap<>();
		user.put("id", SecurityContextUtils.getUserId());
		user.put("name", SecurityContextUtils.getUser().getName());
		user.put("administrator", SecurityContextUtils.isAdmin());
		user.put("authorities", SecurityContextUtils.getUser().getAuthorityList());
		result.put("user", user);

		List<Map<String, Object>> tools = new ArrayList<>();
		for (McpToolDefinition definition : McpToolCatalog.visibleTo(caller)) {
			Map<String, Object> item = new LinkedHashMap<>();
			item.put("name", definition.name());
			item.put("title", definition.title());
			item.put("description", definition.description());
			item.put("requiredPermission", definition.permission() == null ? "无" : definition.permission());
			item.put("write", definition.write());
			item.put("allowed", definition.permission() == null || SecurityContextUtils.isAdmin()
					|| SecurityContextUtils.hasAuthority(definition.permission())

					|| ("project:list".equals(definition.permission())
							&& SecurityContextUtils.hasAuthority("exercise:list")));
			tools.add(item);
		}
		result.put("tools", tools);

		Map<String, Object> questionTypes = new LinkedHashMap<>();
		questionTypes.put("all", Arrays.stream(SurveySchema.QuestionType.values()).map(Enum::name).toList());
		questionTypes.put("autoGradable",
				SurveySchema.QuestionType.examType().stream().map(Enum::name).toList());
		result.put("questionTypes", questionTypes);

		Map<String, Object> limits = new LinkedHashMap<>();
		limits.put("projectPageSizeMax", McpToolCatalog.PAGE_LIMIT);
		limits.put("statMaxAnswers", STAT_MAX_ANSWERS);
		limits.put("idempotencyKeyRequiredForWrite", true);
		result.put("limits", limits);
		return result;
	}

	// ---------- sk_project_list

	@PreAuthorize("hasAuthority('project:list') or hasAuthority('exercise:list')")
	public Map<String, Object> projectList(ProjectQuery query) {
		ProjectQuery condition = query == null ? new ProjectQuery() : query;
		if (condition.getPageSize() > McpToolCatalog.PAGE_LIMIT) {
			condition.setPageSize(McpToolCatalog.PAGE_LIMIT);
		}
		PaginationResponse<ProjectView> page = projectService.listProject(condition);
		List<Map<String, Object>> items = new ArrayList<>();
		if (page != null && page.getList() != null) {
			for (ProjectView view : page.getList()) {
				items.add(brief(view));
			}
		}
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("total", page == null ? 0L : page.getTotal());
		result.put("current", condition.getCurrent());
		result.put("pageSize", condition.getPageSize());
		result.put("list", items);
		return result;
	}



	@PreAuthorize("hasAuthority('project:detail')")
	public Map<String, Object> projectGet(String id) {
		if (!StringUtils.hasText(id)) {
			throw new ValidationException("缺少项目 id");
		}
		ProjectView view = projectService.getProject(id.trim());
		if (view == null) {
			throw new ValidationException("项目不存在：" + id);
		}
		Map<String, Object> result = brief(view);
		result.put("survey", view.getSurvey());
		result.put("setting", view.getSetting());
		result.put("parentId", view.getParentId());
		return result;
	}



	@PreAuthorize("hasAuthority('project:detail')")
	public Map<String, Object> projectValidate(String projectId, SurveySchema schema, ProjectModeEnum mode) {
		SurveySchema target = schema;
		ProjectModeEnum effectiveMode = mode == null ? ProjectModeEnum.exam : mode;
		if (target == null) {
			if (!StringUtils.hasText(projectId)) {
				throw new ValidationException("要么传 projectId（校验已有项目），要么传 schema（校验一份草稿）");
			}
			ProjectView view = projectService.getProject(projectId.trim());
			if (view == null) {
				throw new ValidationException("项目不存在：" + projectId);
			}
			target = view.getSurvey();
			if (view.getMode() != null) {
				effectiveMode = view.getMode();
			}
		}
		return McpSchemaValidator.check(target, effectiveMode);
	}



	@PreAuthorize("hasAuthority('project:create')")
	public Map<String, Object> projectCreate(ProjectRequest request) {
		if (request == null || !StringUtils.hasText(request.getName())) {
			throw new ValidationException("缺少项目名称 name");
		}
		if (request.getSurvey() == null) {
			throw new ValidationException("缺少整卷 schema（survey）；可以先用 sk_project_validate 校验草稿");
		}
		if (request.getMode() == null) {
			request.setMode(ProjectModeEnum.exam);
		}
		ProjectView created = projectService.addProject(request);
		Map<String, Object> result = brief(created);
		result.put("created", true);

		appendSchemaCheck(result, request.getSurvey(), request.getMode());
		return result;
	}



	@PreAuthorize("hasAuthority('project:update')")
	public Map<String, Object> projectUpdate(ProjectRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少项目 id");
		}
		projectService.updateProject(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("id", request.getId());
		result.put("updated", true);

		if (request.getSurvey() != null) {
			ProjectModeEnum mode = request.getMode();
			if (mode == null) {
				ProjectView existing = projectService.getProject(request.getId().trim());
				mode = existing == null ? null : existing.getMode();
			}
			appendSchemaCheck(result, request.getSurvey(), mode);
		}
		return result;
	}

	// ---------- sk_project_publish

	@PreAuthorize("hasAuthority('project:publish') or hasRole('admin')")
	public Map<String, Object> projectPublish(ProjectStatusRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少项目 id");
		}
		if (request.getStatus() == null) {
			throw new ValidationException("缺少 status（1=开启收集，0=停止收集）");
		}
		projectService.updateProjectStatus(request);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("id", request.getId());
		result.put("status", request.getStatus() != null && request.getStatus() == 1 ? 1 : 0);
		result.put("published", request.getStatus() != null && request.getStatus() == 1);
		return result;
	}



	@PreAuthorize("hasAuthority('project:report')")
	public Map<String, Object> reportGet(String projectId, String view, String classId) {
		if (!StringUtils.hasText(projectId)) {
			throw new ValidationException("缺少 projectId");
		}
		String id = projectId.trim();
		String target = StringUtils.hasText(view) ? view.trim().toLowerCase(Locale.ROOT) : "summary";
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("projectId", id);
		switch (target) {
			case "summary" -> {
				ReportData data = loadReport(id, classId);
				result.put("view", "summary");
				result.put("total", data.getTotal());
				result.put("dailyCountStat", data.getDailyCountStat());
			}
			case "questions" -> {
				ReportData data = loadReport(id, classId);
				result.put("view", "questions");
				result.put("total", data.getTotal());
				result.put("statistics", data.getStatistics());
			}
			case "exam" -> fillExamView(result, id);
			default -> throw new ValidationException("view 只能是 summary / questions / exam");
		}
		return result;
	}



	@PreAuthorize("hasAuthority('answer:export')")
	public Map<String, Object> exportCreate(DownloadQuery query) {
		if (query == null || !StringUtils.hasText(query.getProjectId())) {
			throw new ValidationException("缺少 projectId");
		}







		if (StringUtils.hasText(query.getClassId())) {

			classService.assertVisible(query.getClassId());
		}
		else {


			answerAccessGuard.assertProjectAccess(query.getProjectId());
		}
		if (query.getType() == null) {
			query.setType(DownloadQuery.DownloadType.answerPdf);
		}
		String jobId = answerPdfJobService.createJob(query);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("jobId", jobId);
		result.put("status", "queued");
		result.put("hint", "用 sk_export_get + jobId 轮询进度；status=done 后到网页端下载产物");
		return result;
	}



	@PreAuthorize("hasAuthority('answer:export')")
	public Map<String, Object> exportGet(String jobId) {
		if (!StringUtils.hasText(jobId)) {
			throw new ValidationException("缺少 jobId");
		}
		return answerPdfJobService.describeJob(jobId.trim());
	}

	// ---------- 内部

	private ReportData loadReport(String projectId, String classId) {

		return StringUtils.hasText(classId) ? reportService.getData(projectId, true, classId.trim())
				: reportService.getData(projectId, true);
	}

	/** view=exam：按「答卷得分」聚合（提交数、已判分数、平均分、最高最低、及格率、整卷满分） */
	private void fillExamView(Map<String, Object> result, String projectId) {
		ProjectView project = projectService.getProject(projectId);
		double scoreTotal = project == null ? 0D : sumExamScore(project.getSurvey());
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setPageSize(-1);
		long totalAnswers = answerService.count(query);
		if (totalAnswers > STAT_MAX_ANSWERS) {
			throw new ValidationException(
					"答卷过多（" + totalAnswers + " 份，上限 " + STAT_MAX_ANSWERS + "），请先按班级拆分后再统计");
		}
		List<AnswerView> answers = answerService.listAnswersForStat(projectId);
		int scored = 0;
		double sum = 0D;
		double max = 0D;
		double min = Double.MAX_VALUE;
		int passed = 0;
		for (AnswerView answer : answers) {
			Double score = answer.getExamScore();
			if (score == null) {
				continue;
			}
			scored++;
			sum += score;
			max = Math.max(max, score);
			min = Math.min(min, score);
			if (scoreTotal > 0D && score >= scoreTotal * PASS_RATE) {
				passed++;
			}
		}
		result.put("view", "exam");
		result.put("total", totalAnswers);
		result.put("scoredTotal", scored);
		result.put("scoreTotal", round(scoreTotal));
		result.put("averageScore", scored == 0 ? null : round(sum / scored));
		result.put("maxScore", scored == 0 ? null : round(max));
		result.put("minScore", scored == 0 ? null : round(min));
		result.put("passLine", round(scoreTotal * PASS_RATE));
		result.put("passRate", scored == 0 ? null : round(passed * 100D / scored));
	}

	/** 列表项：只给「认得出是哪份卷子」的字段，整卷 schema 留给 sk_project_get */
	private Map<String, Object> brief(ProjectView view) {
		Map<String, Object> item = new LinkedHashMap<>();
		item.put("id", view.getId());
		item.put("name", view.getName());
		item.put("mode", view.getMode() == null ? null : view.getMode().name());
		item.put("status", view.getStatus());
		item.put("published", view.getStatus() != null && view.getStatus() == 1);
		item.put("category", view.getCategory());
		item.put("totalAnswers", view.getTotal());
		item.put("createAt", view.getCreateAt());
		item.put("updateAt", view.getUpdateAt());
		return item;
	}

	/** 把结构校验结果附在写操作的返回值里（不阻断保存） */
	private void appendSchemaCheck(Map<String, Object> result, SurveySchema survey, ProjectModeEnum mode) {
		if (survey == null) {
			return;
		}
		Map<String, Object> checked = McpSchemaValidator.check(survey, mode);
		result.put("schemaOk", checked.get("ok"));
		if (Boolean.FALSE.equals(checked.get("ok"))) {
			result.put("schemaErrors", checked.get("errors"));
			result.put("schemaHint", "结构问题不会阻止保存，但考试开考前必须修好；修完再用 sk_project_validate 复查");
		}
		else if (checked.get("warnings") instanceof List<?> warnings && !warnings.isEmpty()) {
			result.put("schemaWarnings", warnings);
		}
	}

	/** 整卷满分：递归累加 examScore（容器节点自己不占分） */
	static double sumExamScore(SurveySchema schema) {
		if (schema == null) {
			return 0D;
		}
		double total = 0D;
		SurveySchema.Attribute attribute = schema.getAttribute();
		if (attribute != null && attribute.getExamScore() != null) {
			total += attribute.getExamScore();
		}
		if (schema.getChildren() != null) {
			for (SurveySchema child : schema.getChildren()) {
				total += sumExamScore(child);
			}
		}
		return total;
	}

	private static double round(double value) {
		return Math.round(value * 100D) / 100D;
	}

}