package cn.surveyking.server.ai.core;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.AiPaperJobView;
import cn.surveyking.server.domain.dto.SurveySchema;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;





























public final class AiContentGuard {


	private static final Set<SurveySchema.QuestionType> CHOICE_TYPES = Set.of(SurveySchema.QuestionType.Radio,
			SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Judge);


	private static final Set<SurveySchema.QuestionType> BLANK_TYPES = Set.of(SurveySchema.QuestionType.FillBlank,
			SurveySchema.QuestionType.MultipleBlank, SurveySchema.QuestionType.Textarea);


	private static final double SCORE_TOLERANCE = 0.01;


	private static final int TYPE_COUNT_TOLERANCE = 1;


	private static final int MAX_CHAT_REPLY_CHARS = 6000;

	private AiContentGuard() {
	}

	/** 校验出卷结果，通过则返回统计数字（预览表直接用）；返回 题量 / 总分 / 题型分布 */
	public static AiPaperJobView.Stats check(AiPaperSpec spec, List<SurveySchema> questions) {
		if (spec == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "出卷参数为空");
		}
		if (CollectionUtils.isEmpty(questions)) {
			throw reject("没有生成任何题目");
		}
		if (questions.size() != spec.getQuestionCount()) {
			throw reject("题量不符：要求 " + spec.getQuestionCount() + " 题，实际 " + questions.size() + " 题");
		}

		Set<String> ids = new HashSet<>();
		LinkedHashMap<String, Integer> typeCount = new LinkedHashMap<>();
		LinkedHashMap<String, Double> typeScore = new LinkedHashMap<>();
		double totalScore = 0D;
		for (int index = 0; index < questions.size(); index++) {
			SurveySchema question = questions.get(index);
			checkQuestion(question, index + 1, ids);
			String type = question.getType().name();
			typeCount.merge(type, Integer.valueOf(1), (left, right) -> Integer.valueOf(left.intValue() + 1));
			typeScore.merge(type, question.getAttribute().getExamScore(), Double::sum);
			totalScore += question.getAttribute().getExamScore().doubleValue();
		}

		checkTypeCounts(spec, typeCount);
		checkTotalScore(spec, totalScore);

		AiPaperJobView.Stats stats = new AiPaperJobView.Stats();
		stats.setQuestionCount(Integer.valueOf(questions.size()));
		stats.setTotalScore(Double.valueOf(round(totalScore)));
		stats.setTypeCount(typeCount);
		stats.setTypeScore(typeScore);
		return stats;
	}

	/** 只做逐题校验（不看题量/配比/总分）：老师采纳后写入项目 schema 前用 */
	public static void checkAccepted(List<SurveySchema> questions) {
		if (CollectionUtils.isEmpty(questions)) {
			throw reject("没有要采纳的题目");
		}
		Set<String> ids = new HashSet<>();
		for (int index = 0; index < questions.size(); index++) {
			checkQuestion(questions.get(index), index + 1, ids);
		}
	}



	/** 对话回复校验：只判断「这段正文能不能直接给用户看」，不改写内容；返回 可直接渲染的正文（超长时已截断并标注） */
	public static String checkChatReply(String text) {
		if (!StringUtils.hasText(text)) {
			throw chatReject("AI 没有返回内容，请换个问法再试一次");
		}
		String value = unwrapChatFence(text.trim());
		if (!StringUtils.hasText(value)) {
			throw chatReject("AI 只返回了一个空代码块，请重试");
		}
		if (value.contains(AiPageContext.BEGIN) || value.contains(AiPageContext.END)) {

			throw chatReject("AI 回复里带出了系统提示词片段，已拦截");
		}
		if (value.length() > MAX_CHAT_REPLY_CHARS) {
			value = value.substring(0, MAX_CHAT_REPLY_CHARS).trim() + "\n…（回复过长，已截断）";
		}
		return value;
	}

	/** 整段被一对 ``` 包住时把围栏拆掉：这是排版，不是内容改写 */
	private static String unwrapChatFence(String text) {
		if (!text.startsWith("```")) {
			return text;
		}
		int firstLineEnd = text.indexOf('\n');
		if (firstLineEnd < 0) {
			return text;
		}
		String body = text.substring(firstLineEnd + 1);
		int fence = body.lastIndexOf("```");
		if (fence < 0 || StringUtils.hasText(body.substring(fence + 3))) {
			return text;
		}
		return body.substring(0, fence).trim();
	}

	private static ErrorCodeException chatReject(String reason) {
		return new ErrorCodeException(ErrorCode.ValidationError, "AI 对话回复未通过校验：" + reason);
	}

	/** 逐题检查：结构 + 能不能判分 */
	private static void checkQuestion(SurveySchema question, int number, Set<String> ids) {
		if (question == null || question.getType() == null) {
			throw reject("第 " + number + " 题缺题型");
		}
		if (!StringUtils.hasText(question.getTitle())) {
			throw reject("第 " + number + " 题缺题干");
		}
		if (!StringUtils.hasText(question.getId())) {
			throw reject("第 " + number + " 题缺 id");
		}
		if (!ids.add(question.getId())) {
			throw reject("第 " + number + " 题的 id 与前面的题重复");
		}
		if (!AiPaperSpec.SUPPORTED_TYPES.contains(question.getType())) {
			throw reject("第 " + number + " 题的题型 " + question.getType() + " 不在支持的题型里");
		}
		SurveySchema.Attribute attribute = question.getAttribute();
		if (attribute == null || attribute.getExamScore() == null || attribute.getExamScore() <= 0) {
			throw reject("第 " + number + " 题没有配置分值");
		}
		if (attribute.getExamAnswerMode() == null) {
			throw reject("第 " + number + " 题没有配置计分方式");
		}
		checkAnswers(question, number);
	}

	/** 选择题看选项，填空题/简答题看标准答案 */
	private static void checkAnswers(SurveySchema question, int number) {
		SurveySchema.QuestionType type = question.getType();
		if (CHOICE_TYPES.contains(type)) {
			if (CollectionUtils.isEmpty(question.getDataSource())) {
				throw reject("第 " + number + " 题是选择题，但缺少选项（dataSource）");
			}
			if (CollectionUtils.isEmpty(question.getChildren())) {
				throw reject("第 " + number + " 题是选择题，但缺少选项子题（children）");
			}
			boolean hasCorrect = question.getChildren().stream().filter(child -> child != null)
					.anyMatch(child -> child.getAttribute() != null
							&& StringUtils.hasText(child.getAttribute().getExamCorrectAnswer()));
			if (!hasCorrect) {
				throw reject("第 " + number + " 题是选择题，但没有任何一个选项标了正确答案");
			}
			Set<String> optionIds = new HashSet<>();
			for (SurveySchema child : question.getChildren()) {
				if (child == null || !StringUtils.hasText(child.getId())) {
					throw reject("第 " + number + " 题有选项缺 id");
				}
				optionIds.add(child.getId());
				if (!StringUtils.hasText(child.getTitle())) {
					throw reject("第 " + number + " 题有选项缺文本");
				}
			}
			for (SurveySchema.DataSource source : question.getDataSource()) {
				if (source == null || !StringUtils.hasText(source.getValue())
						|| !optionIds.contains(source.getValue())) {
					throw reject("第 " + number + " 题的选项列表与选项子题对不上（dataSource 与 children 不一致）");
				}
			}
			return;
		}
		if (BLANK_TYPES.contains(type)) {
			if (CollectionUtils.isEmpty(question.getChildren())) {
				throw reject("第 " + number + " 题缺少标准答案");
			}
			for (SurveySchema child : question.getChildren()) {
				if (child == null || child.getAttribute() == null
						|| !StringUtils.hasText(child.getAttribute().getExamCorrectAnswer())) {
					throw reject("第 " + number + " 题有空的参考答案");
				}
			}
		}
	}

	/** 每种题型的题数必须与期望一致（允许 ±1 题的凑整误差），多出来的题型也算不符 */
	private static void checkTypeCounts(AiPaperSpec spec, LinkedHashMap<String, Integer> actual) {
		LinkedHashMap<String, Integer> expected = spec.expectedTypeCount();
		for (String type : actual.keySet()) {
			if (!expected.containsKey(type)) {
				throw reject("多出了没有要求的题型：" + type + " " + actual.get(type) + " 题");
			}
		}
		for (var entry : expected.entrySet()) {
			int want = entry.getValue().intValue();
			int got = actual.getOrDefault(entry.getKey(), Integer.valueOf(0)).intValue();
			if (Math.abs(want - got) > TYPE_COUNT_TOLERANCE) {
				throw reject(
						"题型配比不符：" + spec.typeLabel(entry.getKey()) + " 要求 " + want + " 题，实际 " + got + " 题");
			}
		}
	}

	private static void checkTotalScore(AiPaperSpec spec, double actual) {
		if (Math.abs(actual - spec.getTotalScore()) > SCORE_TOLERANCE) {
			throw reject("总分不符：要求 " + trimScore(spec.getTotalScore()) + " 分，实际合计 " + trimScore(actual) + " 分");
		}
	}

	private static ErrorCodeException reject(String reason) {
		return new ErrorCodeException(ErrorCode.ValidationError, "AI 出卷结果未通过校验：" + reason);
	}

	private static double round(double value) {
		return Math.round(value * 100D) / 100D;
	}

	private static String trimScore(double value) {
		return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(round(value));
	}

}
