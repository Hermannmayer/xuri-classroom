package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.Tuple2;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.FieldPermissionType;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.DateUtils;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicAnswerView;
import cn.surveyking.server.domain.dto.PublicQueryRequest;
import cn.surveyking.server.domain.dto.PublicQueryVerifyView;
import cn.surveyking.server.domain.dto.PublicQueryView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 公开查询：按链接查成绩单、按条件过滤字段、按 url 参数拼模糊匹配。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 抽出的第二块。之前它和答题、交卷、统计挤在同一个 1600 行的类里，
 * 且 {@code findAnswerByQuery} 要强转 {@code AnswerServiceImpl} 才能用 {@code ServiceImpl.list}；
 * 现在查询能力收在 {@code AnswerService.listByProjectAndLikeConditions}，这里只依赖接口。
 */
@Component
@RequiredArgsConstructor
public class PublicQueryService {

	private final ProjectService projectService;

	private final AnswerService answerService;

	private final WechatAccessGuard wechatAccessGuard;

	private final MessageSource messageSource;
	/**
	 * @param request
	 * @return
	 */
	@SneakyThrows
	public PublicQueryVerifyView loadQuery(PublicQueryRequest request) {
		Tuple2<ProjectView, ProjectSetting.PublicQuery> projectAndQuery = getProjectAndQueryThenValidate(request);
		// 公开查询同样是"打开一份问卷"：问卷设了「仅微信打开」时也要拦，否则可以从查询链接绕过限制
		wechatAccessGuard.requireWechatAccess(projectAndQuery.getFirst());
		SurveySchema schema = buildQueryFormSchema(projectAndQuery.getFirst(), projectAndQuery.getSecond());
		PublicQueryVerifyView view = new PublicQueryVerifyView();
		view.setSchema(schema);
		return view;
	}

	public PublicQueryView getQueryResult(PublicQueryRequest request) {
		Tuple2<ProjectView, ProjectSetting.PublicQuery> projectAndQuery = getProjectAndQueryThenValidate(request);
		wechatAccessGuard.requireWechatAccess(projectAndQuery.getFirst());
		SurveySchema schema = buildQueryResultSchema(projectAndQuery.getFirst(), projectAndQuery.getSecond());
		PublicQueryView view = new PublicQueryView();
		view.setSchema(schema);
		List<AnswerView> answers = findAnswerByQuery(request, projectAndQuery);
		// 根据配置的权限信息过滤答案
		LinkedHashMap<String, Integer> fieldPermission = projectAndQuery.getSecond().getFieldPermission();
		view.setFieldPermission(fieldPermission);
		view.setAnswers(answers.stream().map(answer -> {
			filterAnswerByFieldPermission(answer.getAnswer(), fieldPermission);
			PublicAnswerView answerView = new PublicAnswerView();
			answerView.setAnswerId(answer.getId());
			answerView.setAnswer(answer.getAnswer());
			if (FieldPermissionType.visible.equals(fieldPermission.get("examScore"))
					|| FieldPermissionType.editable.equals(fieldPermission.get("examScore"))) {
				// 公开查询允许查询分值
				answer.getAnswer().put("examScore", Collections.singletonMap("examScore", answer.getExamScore()));
			}
			answerView.setCreateAt(answer.getCreateAt());
			return answerView;
		}).collect(Collectors.toList()));
		return view;
	}

	private Tuple2<ProjectView, ProjectSetting.PublicQuery> getProjectAndQueryThenValidate(PublicQueryRequest request) {
		ProjectView project = projectService.getProject(request.getId());
		// 项目或设置缺失时直接解引用会 NPE，被全局兜底成 500。公开查询链接应该统一回「链接已失效」：
		// 既不泄露项目是否存在，也能让前端显示一句可读的提示（而不是「服务出了点问题」）。
		if (project == null || project.getSetting() == null || project.getSetting().getSubmittedSetting() == null) {
			throw new ErrorCodeException(ErrorCode.QueryNotExist);
		}
		List<ProjectSetting.PublicQuery> queries = project.getSetting().getSubmittedSetting().getPublicQuery();
		if (queries == null || queries.size() == 0) {
			throw new ErrorCodeException(ErrorCode.QueryNotExist);
		}
		ProjectSetting.PublicQuery query = queries.stream().filter(x -> Objects.equals(x.getId(), request.getResultId()))
				.findFirst().orElseThrow(() -> new ErrorCodeException(ErrorCode.QueryNotExist));
		validatePublicQuery(query, request.getAnswer());
		return new Tuple2<>(project, query);
	}

	/**
	 * @param query 公开查询配置
	 * @param answer 查询答案
	 */
	@SneakyThrows
	private void validatePublicQuery(ProjectSetting.PublicQuery query, LinkedHashMap answer) {
		if (Boolean.FALSE.equals(query.getEnabled())) {
			throw new ErrorCodeException(ErrorCode.QueryDisabled);
		}
		SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		List<String> linkValidityPeriod = query.getLinkValidityPeriod();
		if (linkValidityPeriod != null && linkValidityPeriod.size() == 2 && !DateUtils.isBetween(new Date(),
				sdf.parse(linkValidityPeriod.get(0)), sdf.parse(linkValidityPeriod.get(1)))) {
			throw new ErrorCodeException(ErrorCode.QueryDisabled);
		}
		// 校验密码
		if (isNotBlank(query.getPassword()) && answer != null) {
			if (!answer.containsKey(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID)) {
				throw new ErrorCodeException(ErrorCode.QueryPasswordError);
			}
			String password = (String) ((Map) answer.get(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID))
					.get(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID);
			if (isBlank(password) || !query.getPassword().equals(password.trim())) {
				throw new ErrorCodeException(ErrorCode.QueryPasswordError);
			}
			answer.remove(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID);
		}
	}

	/**
	 * 前端支持动态主题(问卷主题/表单主题)切换，动态构建查询表单
	 * @param project
	 * @param query
	 * @return
	 */
	private SurveySchema buildQueryFormSchema(ProjectView project, ProjectSetting.PublicQuery query) {
		SurveySchema schema = SurveySchema.builder().id(query.getId()).title(query.getTitle())
				.description(query.getDescription())
				.children(findMatchChildrenInSchema(query.getConditionQuestion(), project))
				.attribute(SurveySchema.Attribute.builder().submitButton(i18n("survey.query.submit")).build()).build();
		// 目前只支持文本题 #{huaw}#{fhpd}
		if (isNotBlank(query.getPassword())) {
			// 添加一个password的schema，用于密码校验
			SurveySchema passwordSchema = SurveySchema.builder().id(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID)
					.title(i18n("survey.password.title")).type(SurveySchema.QuestionType.FillBlank)
					.attribute(SurveySchema.Attribute.builder().required(true).build()).build();
			passwordSchema.setChildren(Collections
					.singletonList(SurveySchema.builder().id(AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID).build()));
			schema.getChildren().add(passwordSchema);
		}
		return schema;
	}

	private List<SurveySchema> findMatchChildrenInSchema(String conditionQuestion, ProjectView project) {
		if (isBlank(conditionQuestion)) {
			return new ArrayList<>();
		}
		Pattern condPattern = Pattern.compile("#\\{(.*?)\\}");
		Matcher m = condPattern.matcher(conditionQuestion);
		List<String> conditionIds = new ArrayList<>();
		while (m.find()) {
			String qId = m.group(1);
			conditionIds.add(qId);
		}
		return SchemaHelper.flatSurveySchema(project.getSurvey()).stream()
				.filter(qSchema -> conditionIds.contains(qSchema.getId())).collect(Collectors.toList());
	}

	/**
	 * 根据配置的字段权限信息来过滤要查询的字段
	 * @param project
	 * @param query
	 * @return
	 */
	private SurveySchema buildQueryResultSchema(ProjectView project, ProjectSetting.PublicQuery query) {
		SurveySchema schema = project.getSurvey().deepCopy();
		SchemaHelper.updateSchemaByPermission(query.getFieldPermission(), schema);
		if (query.getFieldPermission().values().contains(FieldPermissionType.editable)) {
			schema.setAttribute(
					SurveySchema.Attribute.builder().submitButton(i18n("survey.edit.submit")).suffix(null).build());
		}
		else {
			schema.setAttribute(null);
		}
		if (ProjectModeEnum.exam.equals(project.getMode())) {
			schema.getChildren().add(SurveySchema.builder().id("examScore").title(i18n("survey.score.title"))
					.type(SurveySchema.QuestionType.FillBlank)
					.attribute(SurveySchema.Attribute.builder().readOnly(true).build())
					.children(Collections.singletonList(SurveySchema.builder().id("examScore").build())).build());
		}
		// 公开查询表单需要取消结束、显示隐藏、跳转规则
		SchemaHelper.ignoreAttributes(schema, "finishRule", "visibleRule", "jumpRule");
		return schema;
	}

	/**
	 * @param request 提交的请求
	 * @param projectAndQuery 项目信息和当前查询信息
	 * @return
	 */
	private List<AnswerView> findAnswerByQuery(PublicQueryRequest request,
			Tuple2<ProjectView, ProjectSetting.PublicQuery> projectAndQuery) {
		ProjectView projectView = projectAndQuery.getFirst();
		List<SurveySchema> conditionSchemaList = findMatchChildrenInSchema(
				projectAndQuery.getSecond().getConditionQuestion(), projectAndQuery.getFirst());
		if (conditionSchemaList.size() == 0 && request.getQuery().size() == 0) {
			throw new ErrorCodeException(ErrorCode.QueryResultNotExist);
		}
		SchemaHelper.TreeNode treeNode = SchemaHelper.SurveySchema2TreeNode(projectView.getSurvey());

		// 通过 url 参数构建查询表单
		LinkedHashMap<String, Map> queryFormValues = buildFormValuesFromQueryParameter(treeNode, request.getQuery());
		// 将查询表单和url参数构建的查询表单合并。
		// 只带 url 参数（前端用 ?q1o1=xxx 这种查询链接）时 answer 为 null，
		// 直接 putAll 会 NPE，整个公开查询 500 —— 这里补空判断。
		if (request.getAnswer() != null) {
			queryFormValues.putAll(request.getAnswer());
		}

		List<String> likeConditions = new ArrayList<>();
		queryFormValues.forEach((qId, qValueObj) -> likeConditions
				.add(buildLikeQueryConditionOfQuestion(treeNode.getTreeNodeMap().get(qId), qValueObj)));
		List<AnswerView> answer = answerService.listByProjectAndLikeConditions(projectView.getId(), likeConditions);
		if (answer.size() == 0) {
			throw new ErrorCodeException(ErrorCode.QueryResultNotExist);
		}
		// 根据配置过滤结果
		return answer;
	}

	/**
	 * 通过查询参数里面构建 form values
	 * @param query
	 * @return
	 */
	private LinkedHashMap buildFormValuesFromQueryParameter(SchemaHelper.TreeNode surveySchemaTreeNode,
			Map<String, String> query) {
		LinkedHashMap<String, Map> formValues = new LinkedHashMap<>();
		query.forEach((id, value) -> {
			// 默认为选项
			SchemaHelper.TreeNode findNode = surveySchemaTreeNode.getTreeNodeMap().get(id);
			String questionId = findNode.getParent().getData().getId();
			Map questionValueMap = formValues.computeIfAbsent(questionId, k -> new HashMap<>());
			questionValueMap.put(id, value);
		});
		return formValues;
	}

	/**
	 * 通过问题答案手动构建like 查询
	 * @param qNode 当前问题的 schema node 节点
	 * @param qValueObj 当前问题的答案
	 * @return
	 */
	private String buildLikeQueryConditionOfQuestion(SchemaHelper.TreeNode qNode, Map qValueObj) {
		SurveySchema optionSchema = qNode.getData().getChildren().get(0);
		String optionId = optionSchema.getId();
		Object optionValue = qValueObj.get(optionId);
		String value = optionValue.toString();
		// 选项非数值类型
		if (optionSchema.getAttribute() == null
				|| !SurveySchema.DataType.number.equals(optionSchema.getAttribute().getDataType())) {
			value = "\"" + value + "\"";
		}
		return String.format("{\"%s\":%s}", optionId, value);
	}

	/**
	 * 根据字段权限配置过滤结果集，过滤掉隐藏题的答案
	 * @param answer
	 * @param fieldPermission
	 */
	private void filterAnswerByFieldPermission(LinkedHashMap answer, LinkedHashMap<String, Integer> fieldPermission) {
		fieldPermission.entrySet().forEach(entry -> {
			String qId = entry.getKey();
			Integer permission = entry.getValue();
			if (FieldPermissionType.hidden == permission) {
				answer.remove(qId);
			}
		});
	}
	private String i18n(String key, Object... args) {
		return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
	}

}