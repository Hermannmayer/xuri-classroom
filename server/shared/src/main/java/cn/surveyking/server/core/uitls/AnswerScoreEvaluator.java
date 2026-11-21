package cn.surveyking.server.core.uitls;

import cn.surveyking.server.domain.dto.SurveySchema;
import lombok.extern.slf4j.Slf4j;

import java.util.*;







@Slf4j
public class AnswerScoreEvaluator {


	private final SurveySchema schema;


	private final LinkedHashMap answer;


	private final Map<String, Double> manualOverrides;

	List<Evaluator> evaluatorList = new ArrayList<>();

	LinkedHashMap<String, Double> questionScore = new LinkedHashMap<>();

	public AnswerScoreEvaluator(SurveySchema schema, LinkedHashMap answer) {
		this(schema, answer, null);
	}

	/**
	 * 带人工批改覆盖分的构造。
	 *
	 * <p>覆盖分只对 {@code attribute.examAnswerMode = manual} 的题生效，客观题仍然走原来的 evaluator，
	 * 因此「批改」不可能改掉机器判出来的客观题分数。
	 *
	 * @param manualOverrides 人工批改结果（questionId → 分数），传 null 等价于原两参构造
	 */
	public AnswerScoreEvaluator(SurveySchema schema, LinkedHashMap answer, Map<String, Double> manualOverrides) {
		this.schema = schema;
		this.answer = answer;
		this.manualOverrides = manualOverrides;
		evaluatorList.add(new OnlyOneEvaluator());
		evaluatorList.add(new SelectAllEvaluator());
		evaluatorList.add(new SelectCorrectEvaluator());
		evaluatorList.add(new SelectEvaluator());
	}

	/**
	 * 计算总分
	 * @return
	 */
	public Double eval() {
		return doEval(schema);
	}

	/**
	 * 获取问题的分值
	 * @return
	 */
	public LinkedHashMap<String, Double> getQuestionScore() {
		return this.questionScore;
	}

	private Double doEval(SurveySchema qSchema) {

		double score = isManual(qSchema) ? manualScore(qSchema)
				: evaluatorList.stream().filter(x -> x.support(qSchema)).findFirst().orElse(new DefaultEvaluator())
						.eval(qSchema);
		if (SurveySchema.QuestionType.dataType().contains(qSchema.getType())) {
			questionScore.put(qSchema.getId(), score);
		}
		if (qSchema.getChildren() != null) {
			for (SurveySchema child : qSchema.getChildren()) {
				score += doEval(child);
			}
		}
		return score;
	}

	/**
	 * 是否人工评分题：只有 {@code attribute.examAnswerMode = manual} 的题允许老师给分。
	 *
	 * <p>批改、交卷状态机、成绩单三处都用这一个判断，避免「前端认为是主观题、后端当成客观题」。
	 */
	public static boolean isManual(SurveySchema qSchema) {
		if (qSchema == null || qSchema.getAttribute() == null) {
			return false;
		}
		if (SurveySchema.ExamScoreMode.manual.equals(qSchema.getAttribute().getExamAnswerMode())) {
			return true;
		}



		if (qSchema.getAttribute().getExamAnswerMode() != null || qSchema.getAttribute().getExamScore() == null) {
			return false;
		}
		SurveySchema.QuestionType type = qSchema.getType();
		return SurveySchema.QuestionType.Textarea.equals(type) || SurveySchema.QuestionType.RichText.equals(type);
	}

	/**
	 * 人工分：没有批改记录时按 0 分算（等价于「待批改，暂不给分」）。
	 *
	 * <p>分数上下限由批改接口校验（0 ~ 该题 examScore），这里只负责取值，不做二次裁剪，
	 * 保证「老师给了几分就是几分」。
	 */
	private Double manualScore(SurveySchema qSchema) {
		if (manualOverrides == null) {
			return .0;
		}
		Double score = manualOverrides.get(qSchema.getId());
		return score == null ? .0 : score;
	}

	interface Evaluator {

		/**
		 * @param qSchema 当前问题的 schema
		 * @return 当前问题的分值
		 */
		Double eval(SurveySchema qSchema);

		/**
		 * @param qSchema 当前问题的 schema
		 * @return 是否能使用当前 evaluator 计算分值
		 */
		boolean support(SurveySchema qSchema);

	}

	class OnlyOneEvaluator implements Evaluator {

		/**
		 * 只有一个正确答案
		 * @param qSchema 当前问题的 schema
		 * @return
		 */
		@Override
		public Double eval(SurveySchema qSchema) {
			String qId = qSchema.getId();
			Double qScore = qSchema.getAttribute().getExamScore();
			Object raw = answer.get(qId);


			if (!(raw instanceof Map)) {
				return .0;
			}
			Map qValue = (Map) raw;
			for (SurveySchema option : qSchema.getChildren()) {

				if (option.getAttribute().getExamCorrectAnswer() != null && qValue.containsKey(option.getId())
						&& qValue.values().size() == 1) {
					return qScore;
				}
			}
			return .0;
		}

		@Override
		public boolean support(SurveySchema qSchema) {
			if (qSchema.getAttribute() == null) {
				return false;
			}
			return SurveySchema.ExamScoreMode.onlyOne.equals(qSchema.getAttribute().getExamAnswerMode())
					&& qSchema.getAttribute().getExamScore() != null && answer.get(qSchema.getId()) != null;
		}

	}

	class SelectAllEvaluator implements Evaluator {

		/**
		 * 全部答对才得分
		 * @param qSchema 当前问题的 schema
		 * @return
		 */
		@Override
		public Double eval(SurveySchema qSchema) {
			String qId = qSchema.getId();
			Double qScore = qSchema.getAttribute().getExamScore();
			Map qValue = (Map) answer.get(qId);
			for (SurveySchema option : qSchema.getChildren()) {

				if (option.getAttribute().getExamCorrectAnswer() == null && qValue.containsKey(option.getId())) {
					return .0;
				}

				if (option.getAttribute().getExamCorrectAnswer() != null && !qValue.containsKey(option.getId())) {
					return .0;
				}

				Object optionValue = qValue.get(option.getId());
				if (option.getAttribute().getExamCorrectAnswer() != null
						&& !optionValueMatchCorrectAnswer(qSchema, option.getId(), optionValue)) {
					return .0;
				}
			}
			return qScore;
		}

		@Override
		public boolean support(SurveySchema qSchema) {
			if (qSchema.getAttribute() == null) {
				return false;
			}
			return SurveySchema.ExamScoreMode.selectAll.equals(qSchema.getAttribute().getExamAnswerMode())
					&& qSchema.getAttribute().getExamScore() != null && answer.get(qSchema.getId()) != null;
		}

	}

	class SelectCorrectEvaluator implements Evaluator {

		/**
		 * 按正确答案计分，选择题答错不得分、填空题按正确答案算分
		 * @param qSchema 当前问题的 schema
		 * @return
		 */
		@Override
		public Double eval(SurveySchema qSchema) {
			String qId = qSchema.getId();
			Map qValue = (Map) answer.get(qId);
			double sum = 0;
			for (SurveySchema option : qSchema.getChildren()) {

				if (!isBlank(qSchema) && option.getAttribute().getExamCorrectAnswer() == null
						&& qValue.containsKey(option.getId())) {
					return .0;
				}

				Object optionValue = qValue.get(option.getId());
				if (optionValueMatchCorrectAnswer(qSchema, option.getId(), optionValue)) {
					sum += option.getAttribute().getExamScore();
				}
			}
			return sum;
		}

		@Override
		public boolean support(SurveySchema qSchema) {
			if (qSchema.getAttribute() == null) {
				return false;
			}
			return SurveySchema.ExamScoreMode.selectCorrect.equals(qSchema.getAttribute().getExamAnswerMode())
					&& qSchema.getAttribute().getExamScore() != null && answer.get(qSchema.getId()) != null;
		}

	}

	class SelectEvaluator implements Evaluator {

		/**
		 * 按选中的答案算分
		 * @param qSchema 当前问题的 schema
		 * @return
		 */
		@Override
		public Double eval(SurveySchema qSchema) {
			String qId = qSchema.getId();
			Map qValue = (Map) answer.get(qId);
			double sum = 0;
			for (SurveySchema option : qSchema.getChildren()) {

				Object optionValue = qValue.get(option.getId());
				if (optionValueMatchCorrectAnswer(qSchema, option.getId(), optionValue)) {
					Double score = option.getAttribute().getExamScore();
					if (score == null) {
						score = .0;
						log.warn("问卷{}问题{}选项{}未设置分值", schema.getId(), qSchema.getId(), option.getId());
					}
					sum += score;
				}
			}
			return sum;
		}

		@Override
		public boolean support(SurveySchema qSchema) {
			if (qSchema.getAttribute() == null) {
				return false;
			}
			return SurveySchema.ExamScoreMode.select.equals(qSchema.getAttribute().getExamAnswerMode())
					&& qSchema.getAttribute().getExamScore() != null && answer.get(qSchema.getId()) != null;
		}

	}

	class DefaultEvaluator implements Evaluator {

		@Override
		public Double eval(SurveySchema qSchema) {
			return 0.0;
		}

		@Override
		public boolean support(SurveySchema qSchema) {
			return true;
		}

	}

	/**
	 * @param qSchema 问题 schema
	 * @param optionId 选项 id
	 * @param optionValue 选项的值
	 * @return 该选项答案是否匹配正确答案
	 */
	private boolean optionValueMatchCorrectAnswer(SurveySchema qSchema, String optionId, Object optionValue) {
		if (optionValue == null) {
			return false;
		}

		if (!isBlank(qSchema)) {
			return true;
		}
		SurveySchema.ExamMatchRule matchRule = qSchema.getAttribute().getExamMatchRule();
		SurveySchema optionSchema = qSchema.getChildren().stream().filter(x -> x.getId().equals(optionId)).findFirst()
				.get();
		String correctAnswer = optionSchema.getAttribute().getExamCorrectAnswer();
		if (correctAnswer == null) {
			log.warn("问卷{}问题{}选项{}未设置正确答案", schema.getId(), qSchema.getId(), optionSchema.getId());
			return false;
		}

		for (String item : correctAnswer.split("\n")) {
			if (SurveySchema.ExamMatchRule.completeSame.equals(matchRule) && item.equals(optionValue.toString())) {
				return true;
			}
			if (SurveySchema.ExamMatchRule.contain.equals(matchRule) && item.contains(optionValue.toString())) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 选择题selectCorrect选择了错误的，整题不会得分；填空题selectCorrect只计算正确的分数
	 * @param qSchema 问题schema
	 * @return 是否是填空题
	 */
	private boolean isBlank(SurveySchema qSchema) {
		if (SurveySchema.QuestionType.Radio.equals(qSchema.getType())
				|| SurveySchema.QuestionType.Checkbox.equals(qSchema.getType())
				|| SurveySchema.QuestionType.Select.equals(qSchema.getType())) {
			return false;
		}
		return true;
	}

}
