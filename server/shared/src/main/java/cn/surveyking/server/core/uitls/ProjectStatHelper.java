package cn.surveyking.server.core.uitls;

import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.PublicStatisticsView;
import cn.surveyking.server.domain.dto.SurveySchema;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;





public class ProjectStatHelper {

	final SurveySchema schema;

	final List<AnswerView> answers;

	public ProjectStatHelper(SurveySchema schema) {
		this.schema = schema;
		this.answers = Collections.emptyList();
	}

	public ProjectStatHelper(SurveySchema schema, List<AnswerView> answers) {
		this.schema = schema;
		this.answers = answers;
	}

	public PublicStatisticsView stat() {
		PublicStatisticsView result = new PublicStatisticsView();
		result.setCount(answers.size());
		Map<String, PublicStatisticsView.QuestionStatistics> questionStatistics = initQuestionStatistics();

		answers.forEach(answerView -> {
			LinkedHashMap<String, Object> answer = answerView.getAnswer();


			if (answer == null) {
				return;
			}
			questionStatistics.entrySet().forEach(entry -> {
				String questionId = entry.getKey();
				PublicStatisticsView.QuestionStatistics qStatistics = entry.getValue();



				Object questionValue = answer.get(questionId);
				if (questionValue instanceof Map) {
					qStatistics.setCount(qStatistics.getCount() + 1);
					Map<?, ?> questionValueMap = (Map<?, ?>) questionValue;
					qStatistics.getOptionStatistics().forEach(optionStatistics -> {
						String optionId = optionStatistics.getOptionId();
						if (questionValueMap.containsKey(optionId)) {
							optionStatistics.setCount(optionStatistics.getCount() + 1);
						}
					});
				}
			});
		});
		result.setQuestionStatistics(questionStatistics);
		return result;
	}

	/** 从投影表（t_answer_item）的聚合结果组装统计 */
	public PublicStatisticsView statFromProjection(long totalAnswers, Map<String, Long> questionCounts,
			Map<String, Map<String, Long>> optionCounts) {
		PublicStatisticsView result = new PublicStatisticsView();
		result.setCount((int) totalAnswers);
		Map<String, PublicStatisticsView.QuestionStatistics> questionStatistics = initQuestionStatistics();
		questionStatistics.forEach((questionId, qStatistics) -> {
			Long answered = questionCounts.get(questionId);
			qStatistics.setCount(answered == null ? 0 : answered.intValue());
			Map<String, Long> perOption = optionCounts.get(questionId);
			qStatistics.getOptionStatistics().forEach(optionStatistics -> {
				Long optionCount = perOption == null ? null : perOption.get(optionStatistics.getOptionId());
				optionStatistics.setCount(optionCount == null ? 0 : optionCount.intValue());
			});
		});
		result.setQuestionStatistics(questionStatistics);
		return result;
	}

	/** 题目属性、子节点、选项属性都可能为空（历史数据 / 手工改库 / 第三方导入）， 任何一处直接解引用都会让整个统计接口 500 */
	private static boolean isStatable(SurveySchema questionSchema) {
		if (questionSchema == null || questionSchema.getAttribute() == null) {
			return false;
		}
		if (Boolean.TRUE.equals(questionSchema.getAttribute().getStatEnabled())) {
			return true;
		}
		if (questionSchema.getChildren() == null) {
			return false;
		}
		return questionSchema.getChildren().stream()
				.anyMatch(child -> child != null && child.getAttribute() != null && child.getAttribute().getQuota() != null);
	}

	private Map<String, PublicStatisticsView.QuestionStatistics> initQuestionStatistics() {
		List<SurveySchema> flatSurveySchema = SchemaHelper.flatSurveySchema(schema);

		List<SurveySchema> canStatSchema = flatSurveySchema.stream().filter(ProjectStatHelper::isStatable)
				.collect(Collectors.toList());

		Map<String, PublicStatisticsView.QuestionStatistics> questionStatistics = new LinkedHashMap<>();
		canStatSchema.forEach(item -> {
			questionStatistics.put(item.getId(),
					new PublicStatisticsView.QuestionStatistics(0, item.getChildren().stream().map(optionSchema -> {
						PublicStatisticsView.OptionStatistics optionStatistics = new PublicStatisticsView.OptionStatistics();
						optionStatistics.setOptionId(optionSchema.getId());
						return optionStatistics;
					}).collect(Collectors.toList())));
		});
		return questionStatistics;
	}

}
