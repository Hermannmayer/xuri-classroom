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

/**
 * 联动题回写：交卷时把当前答卷的答案同步到被联动问卷的答卷里。
 *
 * <p>
 * 从 {@code AnswerServiceImpl#updateLinkSurveyAnswer} 切出。原来用 {@code ServiceImpl} 的
 * {@code getOne/updateById/save}，这里改为等价的 {@code AnswerMapper.selectOne/updateById/insert}
 * （{@code ServiceImpl} 的实现本来就是这三者的一层包装），语义不变。
 */
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
				// children 为空的题（填空/多行文本/评分/NPS/多空等）没有选项，取 get(0) 会越界，
				// 导致「任何含填空题的问卷提交直接 500」，这里必须先判空
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
								// 修改
								for (SurveySchema.LinkField linkField : linkSurvey.getLinkFields()) {
									SchemaHelper.setQuestionValue(linkedAnswer.getAnswer(),
											linkField.getLinkQuestionId(), linkField.getLinkOptionId(),
											SchemaHelper.getQuestionValue(answer.getAnswer(),
													linkField.getFillQuestionId(), linkField.getFillOptionId()));
								}
								answerMapper.updateById(linkedAnswer);
							}
							else {
								// 添加
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
