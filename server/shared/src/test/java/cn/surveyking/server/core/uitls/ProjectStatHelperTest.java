package cn.surveyking.server.core.uitls;

import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.PublicStatisticsView;
import cn.surveyking.server.domain.dto.SurveySchema;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 统计的两条路径必须给出同一个结果。
 *
 * <p>
 * 这条测试是拆 {@code SurveyServiceImpl} 之前的安全网：投影聚合（statFromProjection）与
 * 内存算法（stat）语义一旦分叉，先在这里红。
 */
class ProjectStatHelperTest {

	private static SurveySchema question(String id, boolean statEnabled, String... optionIds) {
		List<SurveySchema> options = new ArrayList<SurveySchema>();
		for (String optionId : optionIds) {
			options.add(SurveySchema.builder().id(optionId).type(SurveySchema.QuestionType.Option).title(optionId).build());
		}
		return SurveySchema.builder().id(id).type(SurveySchema.QuestionType.Radio).title(id)
				.attribute(SurveySchema.Attribute.builder().statEnabled(Boolean.valueOf(statEnabled)).build())
				.children(options).build();
	}

	private static SurveySchema schema() {
		return SurveySchema.builder().id("p1").type(SurveySchema.QuestionType.Survey).title("卷")
				.children(Arrays.asList(question("q1", true, "q1o1", "q1o2", "q1o3"),
						question("q2", true, "q2o1", "q2o2"), question("q3", false, "q3o1")))
				.build();
	}

	private static Map<String, String[]> picks(String qid, String[] options) {
		Map<String, String[]> map = new LinkedHashMap<String, String[]>();
		map.put(qid, options);
		return map;
	}

	private static Map<String, String[]> merge(Map<String, String[]> a, Map<String, String[]> b) {
		Map<String, String[]> map = new LinkedHashMap<String, String[]>();
		map.putAll(a);
		map.putAll(b);
		return map;
	}

	private static AnswerView answer(String id, Map<String, String[]> picks) {
		LinkedHashMap<String, Object> payload = new LinkedHashMap<String, Object>();
		for (Map.Entry<String, String[]> entry : picks.entrySet()) {
			LinkedHashMap<String, Object> chosen = new LinkedHashMap<String, Object>();
			for (String optionId : entry.getValue()) {
				chosen.put(optionId, Boolean.TRUE);
			}
			payload.put(entry.getKey(), chosen);
		}
		AnswerView view = new AnswerView();
		view.setId(id);
		view.setProjectId("p1");
		view.setAnswer(payload);
		return view;
	}

	@Test
	@DisplayName("投影聚合与内存算法结果一致（含未作答、未启用统计的题）")
	void projectionMatchesInMemoryAlgorithm() {
		SurveySchema schema = schema();
		List<AnswerView> answers = Arrays.asList(
				answer("a1", merge(picks("q1", new String[] { "q1o1" }),
						picks("q2", new String[] { "q2o1", "q2o2" }))),
				answer("a2", merge(picks("q1", new String[] { "q1o1", "q1o2" }),
						picks("q3", new String[] { "q3o1" }))),
				answer("a3", picks("q1", new String[] { "q1o3" })));

		PublicStatisticsView inMemory = new ProjectStatHelper(schema, answers).stat();

		Map<String, Long> questionCounts = new HashMap<String, Long>();
		questionCounts.put("q1", Long.valueOf(3));
		questionCounts.put("q2", Long.valueOf(1));
		questionCounts.put("q3", Long.valueOf(1));
		Map<String, Map<String, Long>> optionCounts = new HashMap<String, Map<String, Long>>();
		optionCounts.put("q1", counts("q1o1", 2, "q1o2", 1, "q1o3", 1));
		optionCounts.put("q2", counts("q2o1", 1, "q2o2", 1));
		optionCounts.put("q3", counts("q3o1", 1));

		PublicStatisticsView projection = new ProjectStatHelper(schema).statFromProjection(answers.size(),
				questionCounts, optionCounts);

		assertEquals(inMemory.getCount(), projection.getCount(), "总答卷数应一致");
		assertEquals(inMemory.getQuestionStatistics().keySet(), projection.getQuestionStatistics().keySet(),
				"可统计题目集合应一致（statEnabled=false 的题不进统计）");
		for (String qid : inMemory.getQuestionStatistics().keySet()) {
			PublicStatisticsView.QuestionStatistics expected = inMemory.getQuestionStatistics().get(qid);
			PublicStatisticsView.QuestionStatistics actual = projection.getQuestionStatistics().get(qid);
			assertEquals((int) expected.getCount(), (int) actual.getCount(), "题 " + qid + " 的作答人数");
			assertEquals(optionCountsOf(expected), optionCountsOf(actual), "题 " + qid + " 的选项分布");
		}
	}

	@Test
	@DisplayName("未启用的题不进入统计，即使投影里有它的行")
	void disabledQuestionIsIgnored() {
		SurveySchema schema = schema();
		Map<String, Long> q = new HashMap<String, Long>();
		q.put("q3", Long.valueOf(10));
		Map<String, Map<String, Long>> o = new HashMap<String, Map<String, Long>>();
		o.put("q3", counts("q3o1", 10));
		PublicStatisticsView view = new ProjectStatHelper(schema).statFromProjection(10L, q, o);
		assertEquals(10, (int) view.getCount());
		assertNotNull(view.getQuestionStatistics());
		assertEquals(2, view.getQuestionStatistics().size(), "只有 q1/q2 开启统计");
	}

	@Test
	@DisplayName("题面属性为空时不抛 NPE（线上「统计 500」的根因）")
	void nullAttributeIsTolerated() {
		SurveySchema schema = SurveySchema.builder().id("p1").type(SurveySchema.QuestionType.Survey).title("卷")
				.children(Arrays.asList(
						SurveySchema.builder().id("q1").type(SurveySchema.QuestionType.Radio).title("q1").build(),
						question("q2", true, "q2o1")))
				.build();
		PublicStatisticsView view = new ProjectStatHelper(schema,
				Arrays.asList(answer("a1", picks("q2", new String[] { "q2o1" })))).stat();
		assertEquals(1, view.getQuestionStatistics().size(), "只有 q2 可统计");
	}

	@Test
	@DisplayName("答卷里某题的值为 null 时不抛 NPE")
	void nullAnswerValueIsTolerated() {
		LinkedHashMap<String, Object> payload = new LinkedHashMap<String, Object>();
		payload.put("q1", null);
		AnswerView view = new AnswerView();
		view.setId("a1");
		view.setProjectId("p1");
		view.setAnswer(payload);
		PublicStatisticsView result = new ProjectStatHelper(schema(), Arrays.asList(view)).stat();
		assertEquals(1, result.getCount());
	}

	private static Map<String, Long> counts(Object... pairs) {
		Map<String, Long> map = new LinkedHashMap<String, Long>();
		for (int i = 0; i + 1 < pairs.length; i += 2) {
			map.put(String.valueOf(pairs[i]), Long.valueOf(((Integer) pairs[i + 1]).longValue()));
		}
		return map;
	}

	private static Map<String, Integer> optionCountsOf(PublicStatisticsView.QuestionStatistics statistics) {
		Map<String, Integer> result = new LinkedHashMap<String, Integer>();
		statistics.getOptionStatistics().forEach(o -> result.put(o.getOptionId(), (int) o.getCount()));
		return result;
	}

}
