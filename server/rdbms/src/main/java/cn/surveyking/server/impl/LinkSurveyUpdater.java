package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.core.uitls.SchemaHelper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.LinkedHashMap;
import java.util.Map;









@Component
@RequiredArgsConstructor
public class LinkSurveyUpdater {

	private final AnswerMapper answerMapper;

	/**
	 * 更新原始问卷答案
	 * @param answer
	 * @param project
	 */
	public void updateLinkSurveyAnswer(Answer answer, ProjectView project) {
		SchemaHelper.flatSurveySchema(project.getSurvey()).stream()


				.filter(qSchema -> !CollectionUtils.isEmpty(qSchema.getChildren())
						&& !CollectionUtils.isEmpty(qSchema.getChildren().get(0).getLinkSurveys()))
				.forEach(qSchemaHasLinkSurvey -> {
					Map<String, Object> qValue = (Map<String, Object>) answer.getAnswer()
							.get(qSchemaHasLinkSurvey.getId());
					if (qValue == null) {
						return;
					}
					SurveySchema optionSchemaHasLinkAttr = qSchemaHasLinkSurvey.getChildren().get(0);
					optionSchemaHasLinkAttr.getLinkSurveys().forEach(linkSurvey -> {
						if (Boolean.TRUE.equals(linkSurvey.getEnableUpdate())) {
							Object optionValue = qValue.get(optionSchemaHasLinkAttr.getId());
							Answer linkedAnswer = answerMapper.selectOne(Wrappers.<Answer>lambdaQuery()
									.eq(Answer::getProjectId, linkSurvey.getLinkSurveyId())
									.like(Answer::getAnswer,
											SchemaHelper.buildLinkLikeCondition(linkSurvey, optionValue))
									.orderByDesc(Answer::getCreateAt).last("limit 1"));
							if (linkedAnswer != null) {

								for (SurveySchema.LinkField linkField : linkSurvey.getLinkFields()) {
									SchemaHelper.setQuestionValue(linkedAnswer.getAnswer(),
											linkField.getLinkQuestionId(), linkField.getLinkOptionId(),
											SchemaHelper.getQuestionValue(answer.getAnswer(),
													linkField.getFillQuestionId(), linkField.getFillOptionId()));
								}
								answerMapper.updateById(linkedAnswer);
							}
							else {

								Answer addAnswer = new Answer();
								BeanUtils.copyProperties(answer, addAnswer, "id", "examScore", "examInfo", "answer",
										"projectId");
								addAnswer.setProjectId(linkSurvey.getLinkSurveyId());
								LinkedHashMap addAnswerMap = new LinkedHashMap();
								addAnswer.setAnswer(addAnswerMap);
								SchemaHelper.setQuestionValue(addAnswerMap, linkSurvey.getLinkQuestionId(),
										linkSurvey.getLinkOptionId(), optionValue);
								for (SurveySchema.LinkField linkField : linkSurvey.getLinkFields()) {
									SchemaHelper.setQuestionValue(addAnswerMap, linkField.getLinkQuestionId(),
											linkField.getLinkOptionId(),
											SchemaHelper.getQuestionValue(answer.getAnswer(),
													linkField.getFillQuestionId(), linkField.getFillOptionId()));
								}
								answerMapper.insert(addAnswer);
							}
						}
					});
				});
	}

}
