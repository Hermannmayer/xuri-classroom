package cn.surveyking.server.ai;

import cn.surveyking.server.ai.core.AiContentGuard;
import cn.surveyking.server.ai.core.AiPaperSpec;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.AiPaperGenerateRequest;
import cn.surveyking.server.domain.dto.AiPaperJobView;
import cn.surveyking.server.domain.dto.SurveySchema;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * AI 出卷校验（{@code AiContentGuard}）的规则回归。
 *
 * <p>这一类规则最容易在「优化提示词」时被悄悄放松，所以每条拒收理由都单独钉一个用例：
 * <b>校验不过必须拒绝，且理由要说得出是第几题、缺了什么</b>——老师照着这句话就能改参数重试。
 *
 * <p>纯 JUnit，不起 Spring、不连库。
 *
 * @author p4-backend
 */
class AiContentGuardTest {

	/* ====== 通过 ====== */

	@Test
	@DisplayName("合规的两题卷：校验通过并给出题量/总分/题型分布")
	void acceptsCompliantPaper() {
		List<SurveySchema> questions = List.of(radio("单选题题干", 5D), fillBlank("填空题 ___ ", 5D, "答案"));
		AiPaperJobView.Stats stats = AiContentGuard.check(spec(2, 10D), questions);
		assertEquals(Integer.valueOf(2), stats.getQuestionCount());
		assertEquals(Double.valueOf(10D), stats.getTotalScore());
		assertEquals(Integer.valueOf(1), stats.getTypeCount().get("Radio"));
		assertEquals(Integer.valueOf(1), stats.getTypeCount().get("FillBlank"));
		assertEquals(Double.valueOf(5D), stats.getTypeScore().get("Radio"));
	}

	@Test
	@DisplayName("采纳单题写入：checkAccepted 只做逐题校验，不要求凑满题量")
	void checkAcceptedAllowsSubset() {
		AiContentGuard.checkAccepted(List.of(radio("题干", 5D)));
	}

	/* ====== 拒收 ====== */

	@Test
	@DisplayName("题量不符：2 题要求却只给了 1 题")
	void rejectsQuestionCountMismatch() {
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(2, 10D), List.of(radio("题干", 10D))));
		assertMessage(ex, "题量不符");
		assertEquals(ErrorCode.ValidationError, errorCodeOf(ex));
	}

	@Test
	@DisplayName("选择题没有任何正确答案：拒收并指出第几题")
	void rejectsChoiceWithoutCorrectAnswer() {
		SurveySchema question = radio("单选题题干", 10D);
		question.getChildren().forEach(child -> child.getAttribute().setExamCorrectAnswer(null));
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(1, 10D), List.of(question)));
		assertMessage(ex, "第 1 题");
		assertMessage(ex, "正确答案");
	}

	@Test
	@DisplayName("选择题缺 dataSource：拒收（设计器渲染与判分都要它）")
	void rejectsChoiceWithoutDataSource() {
		SurveySchema question = radio("单选题题干", 10D);
		question.setDataSource(null);
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(1, 10D), List.of(question)));
		assertMessage(ex, "dataSource");
	}

	@Test
	@DisplayName("选择题的 dataSource 与 children 对不上：拒收")
	void rejectsChoiceDataSourceMismatch() {
		SurveySchema question = radio("单选题题干", 10D);
		question.getDataSource().get(0).setValue("not-an-option-id");
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(1, 10D), List.of(question)));
		assertMessage(ex, "对不上");
	}

	@Test
	@DisplayName("填空题没有标准答案：拒收（不替模型编答案）")
	void rejectsBlankWithoutAnswer() {
		SurveySchema question = fillBlank("填空题 ___ ", 10D, "");
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(1, 10D), List.of(question)));
		assertMessage(ex, "参考答案");
	}

	@Test
	@DisplayName("某题没配分值：拒收")
	void rejectsMissingScore() {
		SurveySchema question = radio("单选题题干", 10D);
		question.getAttribute().setExamScore(null);
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(1, 10D), List.of(question)));
		assertMessage(ex, "分值");
	}

	@Test
	@DisplayName("总分不符：要求 100 分、实际 95 分")
	void rejectsTotalScoreMismatch() {
		List<SurveySchema> questions = List.of(radio("题干一", 5D), fillBlank("题干二 ___", 5D, "答案"));
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(2, 100D), questions));
		assertMessage(ex, "总分不符");
		assertMessage(ex, "100");
	}

	@Test
	@DisplayName("多出了没要求的题型：拒收")
	void rejectsUnexpectedQuestionType() {
		List<SurveySchema> questions = List.of(radio("题干", 5D), radio("题干二", 5D), textarea("简答题", 0D));
		AiPaperGenerateRequest request = new AiPaperGenerateRequest();
		request.setSubject("养老护理员");
		request.setLevel("五级");
		request.setQuestionCount(3);
		request.setTotalScore(10D);
		LinkedHashMap<String, Double> ratio = new LinkedHashMap<>();
		ratio.put("Radio", 1D);
		request.setTypeRatio(ratio);
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(AiPaperSpec.of(request), questions));
		assertMessage(ex, "没有要求的题型");
	}

	@Test
	@DisplayName("题目 id 重复：拒收（否则判分会把两道题算成一题）")
	void rejectsDuplicateIds() {
		SurveySchema first = radio("题干一", 5D);
		SurveySchema second = radio("题干二", 5D);
		second.setId(first.getId());
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(2, 10D), List.of(first, second)));
		assertMessage(ex, "重复");
	}

	@Test
	@DisplayName("不支持的题型（上传题）：拒收")
	void rejectsUnsupportedType() {
		SurveySchema question = radio("题干", 10D);
		question.setType(SurveySchema.QuestionType.Upload);
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(1, 10D), List.of(question)));
		assertMessage(ex, "不在支持的题型里");
	}

	@Test
	@DisplayName("空结果：拒收")
	void rejectsEmptyResult() {
		ErrorCodeException ex = assertThrows(ErrorCodeException.class,
				() -> AiContentGuard.check(spec(1, 10D), List.of()));
		assertMessage(ex, "没有生成任何题目");
	}

	/* ====== helpers ====== */

	private static ErrorCode errorCodeOf(ErrorCodeException ex) {
		return ex.getErrorCode();
	}

	private static void assertMessage(ErrorCodeException ex, String expected) {
		assertTrue(ex.getMessage() != null && ex.getMessage().contains(expected),
				"期望消息里包含「" + expected + "」，实际：" + ex.getMessage());
	}

	/** 两型对半的卷（Radio / FillBlank 各一半），够覆盖「配比 + 总分」两条 */
	private static AiPaperSpec spec(int questionCount, double totalScore) {
		AiPaperGenerateRequest request = new AiPaperGenerateRequest();
		request.setSubject("养老护理员");
		request.setLevel("五级");
		request.setQuestionCount(Integer.valueOf(questionCount));
		request.setTotalScore(Double.valueOf(totalScore));
		LinkedHashMap<String, Double> ratio = new LinkedHashMap<>();
		ratio.put("Radio", Double.valueOf(0.5D));
		ratio.put("FillBlank", Double.valueOf(0.5D));
		request.setTypeRatio(ratio);
		return AiPaperSpec.of(request);
	}

	static SurveySchema radio(String title, double score) {
		String questionId = newId();
		List<SurveySchema> children = new ArrayList<>();
		List<SurveySchema.DataSource> sources = new ArrayList<>();
		for (int index = 0; index < 4; index++) {
			String optionId = newId();
			String label = String.valueOf((char) ('A' + index));
			children.add(SurveySchema.builder().id(optionId).title(label).type(SurveySchema.QuestionType.Option)
					.attribute(SurveySchema.Attribute.builder()
							.examCorrectAnswer(index == 1 ? optionId : null).build())
					.build());
			SurveySchema.DataSource source = new SurveySchema.DataSource();
			source.setLabel(label);
			source.setValue(optionId);
			sources.add(source);
		}
		return SurveySchema.builder().id(questionId).title(title).type(SurveySchema.QuestionType.Radio)
				.children(children).dataSource(sources)
				.attribute(SurveySchema.Attribute.builder().examScore(Double.valueOf(score))
						.examAnswerMode(SurveySchema.ExamScoreMode.onlyOne).build())
				.build();
	}

	static SurveySchema fillBlank(String title, double score, String answer) {
		return SurveySchema.builder().id(newId()).title(title).type(SurveySchema.QuestionType.FillBlank)
				.children(List.of(SurveySchema.builder().id(newId())
						.attribute(SurveySchema.Attribute.builder().examCorrectAnswer(answer).build()).build()))
				.attribute(SurveySchema.Attribute.builder().examScore(Double.valueOf(score))
						.examAnswerMode(SurveySchema.ExamScoreMode.selectAll)
						.examMatchRule(SurveySchema.ExamMatchRule.completeSame).build())
				.build();
	}

	static SurveySchema textarea(String title, double score) {
		return SurveySchema.builder().id(newId()).title(title).type(SurveySchema.QuestionType.Textarea)
				.children(List.of(SurveySchema.builder().id(newId())
						.attribute(SurveySchema.Attribute.builder().examCorrectAnswer("参考答案").build()).build()))
				.attribute(SurveySchema.Attribute.builder()
						.examScore(score > 0 ? Double.valueOf(score) : Double.valueOf(5D))
						.examAnswerMode(SurveySchema.ExamScoreMode.manual).build())
				.build();
	}

	private static String newId() {
		return UUID.randomUUID().toString().replace("-", "");
	}

}
