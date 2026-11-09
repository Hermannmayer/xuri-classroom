package cn.surveyking.server.core.uitls;

import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.PublicStatisticsView;
import cn.surveyking.server.domain.dto.SurveySchema;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * @author javahuang
 * @date 2022/3/23
 */
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
			// 空答案（暂存被清空、历史脏数据、或查询只取了统计需要的列）不参与聚合，
			// 否则下面 answer.containsKey 直接 NPE，整个统计接口 500。
			if (answer == null) {
				return;
			}
			questionStatistics.entrySet().forEach(entry -> {
				String questionId = entry.getKey();
				PublicStatisticsView.QuestionStatistics qStatistics = entry.getValue();
				// 注意：containsKey 为 true 不代表值不为 null——填空题没作答、或前端提交了
				// {"q2": null} 时，这里的 get 会拿到 null，直接强转 Map 就是 NPE，
				// 会让整个统计接口 500（线上「有答卷的项目点统计就报错」的根因）。
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

	/**
	 * 从投影表（t_answer_item）的聚合结果组装统计。
	 * <p>
	 * 与 {@link #stat()} 的区别：不在内存里遍历全部答卷，只消费 SQL 的 GROUP BY 结果。
	 * 单场 5000 份 × 100 题时，前者要把几十 MB 的答案 JSON 全读进堆，后者只传回「题 × 选项」量级的计数。
	 * @param totalAnswers 该场答卷总数（与投影行数一致时才应该走这条路）
	 * @param questionCounts questionId → 答了该题的人数
	 * @param optionCounts questionId → optionId → 选了该选项的人数
	 */
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

	/**
	 * 题目属性、子节点、选项属性都可能为空（历史数据 / 手工改库 / 第三方导入），
	 * 任何一处直接解引用都会让整个统计接口 500。
	 */
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
		// 只有问题配置了 statEnabled 和选项配置了 quota 属性的题才能进行统计
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
