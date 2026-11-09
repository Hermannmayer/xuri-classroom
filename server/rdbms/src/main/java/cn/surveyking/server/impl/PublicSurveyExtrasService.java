package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicAttemptRequest;
import cn.surveyking.server.domain.dto.PublicAttemptView;
import cn.surveyking.server.domain.dto.PublicDictRequest;
import cn.surveyking.server.domain.dto.PublicDictView;
import cn.surveyking.server.domain.dto.PublicExamRequest;
import cn.surveyking.server.domain.dto.PublicExamResult;
import cn.surveyking.server.domain.dto.PublicLinkRequest;
import cn.surveyking.server.domain.dto.PublicLinkResult;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.CommDictItem;
import cn.surveyking.server.service.ProjectService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 公开侧的读接口：成绩单、历次作答列表、字典、关联题回填。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 拆出的第八块。这里保留 {@code AnswerServiceImpl} 而不是
 * {@code AnswerService}，是因为「历次作答」与「关联题取值」要用 MyBatis-Plus 的
 * {@code list(Wrappers)} / {@code getOne(Wrappers)}；接口上没有等价语义方法，
 * 而本轮重构不允许改 {@code AnswerServiceImpl} 的接口面。
 */
@Component
@RequiredArgsConstructor
public class PublicSurveyExtrasService {

	private final ProjectService projectService;

	/** 见类注释：需要 IService 的 list/getOne */
	private final AnswerServiceImpl answerService;

	private final DictItemServiceImpl dictItemService;

	private final ExamControlService examControlService;

	private final WechatAccessGuard wechatAccessGuard;

	private final AnswerLookup answerLookup;

	private final ObjectMapper objectMapper;

	/**
	 * 成绩查询页面获取成绩信息
	 * @param request
	 * @return
	 */
	public PublicExamResult loadExamResult(PublicExamRequest request) {
		ProjectView project = projectService.getProject(request.getId());
		AnswerView answerView = answerLookup.getAnswerForProject(project.getId(), request.getAnswerId(),
				Boolean.TRUE.equals(project.getSetting().getSubmittedSetting().getRankVisible()));
		ProjectSetting.SubmittedSetting submittedSetting = project.getSetting().getSubmittedSetting();
		ProjectSetting.ExamSetting examSetting = project.getSetting().getExamSetting();
		PublicExamResult result = new PublicExamResult();
		result.setName(project.getName());
		// 可以查看正确答案和解析;
		// 考试结束之后才可以查看正确答案和解析
		if (Boolean.TRUE.equals(submittedSetting.getAnswerAnalysis()) && examControlService.examFinished(examSetting)) {
			result.setAnswer(answerView.getAnswer());
			result.setSchema(project.getSurvey());
			result.setExamInfo(answerView.getExamInfo());
		}
		// 显示成绩单
		if (Boolean.TRUE.equals(submittedSetting.getTranscriptVisible())) {
			result.setExamScore(answerView.getExamScore());
		}
		// 显示排名 TODO:显示排行榜
		if (Boolean.TRUE.equals(submittedSetting.getRankVisible())) {
			result.setRank(answerView.getRank());
		}
		// 随机问题：每个人拿到的题不同，必须用答卷上的快照
		if (answerView.getSurvey() != null) {
			// 但历史快照在保存时把 examCorrectAnswer 剥掉了（实测 378 个正确选项 → 0），
			// 用它会让解析页永远显示「未设置正确答案」。这种情况下回退到项目 schema，
			// 保证老答卷也能看到正确答案；只有快照里确实还带着答案时才优先用快照。
			if (containsCorrectAnswer(answerView.getSurvey())) {
				result.setSchema(answerView.getSurvey());
			}
		}
		result.setMetaInfo(answerView.getMetaInfo());
		return result;
	}

	/**
	 * 递归检查一份 schema 里是否还带着正确答案。
	 *
	 * <p>用途：判断答卷上那份 survey 快照能不能用来做答案解析。
	 * 历史快照在保存时被 {@code ignoreAttributes} 剥掉过 examCorrectAnswer，
	 * 这类快照不能用来渲染成绩单。
	 */
	private boolean containsCorrectAnswer(SurveySchema schema) {
		if (schema == null || schema.getChildren() == null) {
			return false;
		}
		for (SurveySchema child : schema.getChildren()) {
			if (child.getAttribute() != null && child.getAttribute().getExamCorrectAnswer() != null) {
				return true;
			}
			if (containsCorrectAnswer(child)) {
				return true;
			}
		}
		return false;
	}

	/** 切屏计数的按键锁：同一份答卷的读-改-写串行化，避免并发丢更新 */

	/** 当前登录用户在这份试卷/问卷上的历次已提交答卷（按时间倒序），供「再考一次」的成绩列表使用 */
	public List<PublicAttemptView> listPublicAttempts(PublicAttemptRequest request) {
		String userId = SecurityContextUtils.getUserId();
		if (request == null || isBlank(request.getProjectId()) || isBlank(userId)) {
			return Collections.emptyList();
		}
		return answerService
				.list(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, request.getProjectId())
						.eq(Answer::getCreateBy, userId).eq(Answer::getTempSave, 1).isNotNull(Answer::getAnswer)
						.orderByDesc(Answer::getCreateAt))
				.stream().map(answer -> {
					PublicAttemptView view = new PublicAttemptView();
					view.setAnswerId(answer.getId());
					view.setExamScore(answer.getExamScore());
					view.setCreateAt(answer.getCreateAt() == null ? null : answer.getCreateAt().getTime());
					return view;
				}).collect(Collectors.toList());
	}

	public List<PublicDictView> loadDict(PublicDictRequest request) {
		int limit = Math.min(Math.max(request.getLimit() != null ? request.getLimit() : 50, 1), 100);
		return dictItemService
				.list(Wrappers.<CommDictItem>lambdaQuery().eq(CommDictItem::getDictCode, request.getDictCode())
						.eq(request.getCascaderLevel() != null, CommDictItem::getItemLevel, request.getCascaderLevel())
						.eq(request.getParentValue() != null, CommDictItem::getParentItemValue,
								request.getParentValue())
						.and(isNotBlank(request.getSearch()),
								i -> i.like(CommDictItem::getItemName, request.getSearch()).or()
										.like(CommDictItem::getItemValue, request.getSearch()))
						.last("limit " + limit))
				.stream().map(x -> {
					PublicDictView view = new PublicDictView();
					view.setLabel(x.getItemName());
					view.setValue(x.getItemValue());
					return view;
				}).collect(Collectors.toList());
	}

	public PublicLinkResult loadLinkResult(PublicLinkRequest request) {
		PublicLinkResult result = new PublicLinkResult();
		ProjectView projectView = projectService.getProject(request.getProjectId());
		if (projectView == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		wechatAccessGuard.requireWechatAccess(projectView);
		SurveySchema currentQuestionSchema = SchemaHelper.flatSurveySchema(projectView.getSurvey()).stream()
				.filter(x -> x.getId().equals(request.getQuestionId())).findFirst().orElseGet(() -> {
					SurveySchema surveySchema = new SurveySchema();
					surveySchema.setChildren(new ArrayList<>());
					return surveySchema;
				});

		List<SurveySchema.LinkSurvey> linkSurveys = currentQuestionSchema.getChildren().stream()
				.filter(x -> request.getOptionId().equals(x.getId())).findFirst().orElseGet(SurveySchema::new)
				.getLinkSurveys();
		if (linkSurveys == null) {
			throw new ErrorCodeException(ErrorCode.LinkConditionNotFound);
		}
		LinkedHashMap<String, Map<String, Object>> fillAnswer = new LinkedHashMap<>();
		result.setAnswer(fillAnswer);
		for (SurveySchema.LinkSurvey linkSurvey : linkSurveys) {
			Answer answer = answerService
					.getOne(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, linkSurvey.getLinkSurveyId())
							.like(Answer::getAnswer, buildLinkLikeCondition(linkSurvey, request.getValue()))
							.orderByDesc(Answer::getCreateAt).last("limit 1"));
			fillLinkFieldAndAnswer(answer != null ? answer.getAnswer() : null, linkSurvey.getLinkFields(), fillAnswer);
		}

		return result;
	}

	@SneakyThrows
	private String buildLinkLikeCondition(SurveySchema.LinkSurvey linkSurvey, Object value) {
		Map<String, Object> optionValue = new HashMap<>();
		optionValue.put(linkSurvey.getLinkOptionId(), value);
		// Map<String, Map<String, Object>> questionValue = new HashMap<>();
		// questionValue.put(linkSurvey.getLinkQuestionId(), optionValue);
		return StringUtils.substringBetween(objectMapper.writeValueAsString(optionValue), "{", "}");
	}

	private void fillLinkFieldAndAnswer(LinkedHashMap answer, List<SurveySchema.LinkField> linkFields,
			LinkedHashMap<String, Map<String, Object>> fillAnswer) {
		for (SurveySchema.LinkField linkField : linkFields) {
			Map<String, Object> questionValueMap = fillAnswer.computeIfAbsent(linkField.getFillQuestionId(),
					(k) -> new HashMap<>());
			if (answer == null) {
				continue;
			}
			Map<String, Object> linkQuestionValue = (Map<String, Object>) answer.get(linkField.getLinkQuestionId());
			if (linkQuestionValue == null) {
				continue;
			}
			questionValueMap.put(linkField.getFillOptionId(), linkQuestionValue.get(linkField.getLinkOptionId()));
		}
	}

}
