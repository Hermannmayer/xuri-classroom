package cn.surveyking.server.api;

import cn.surveyking.server.domain.model.AnswerItem;
import cn.surveyking.server.impl.AnswerItemAnswerRebuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * S2-4 回归：从投影重建 answer。
 *
 * <p>
 * 关键不是「能拼出 Map」，而是**类型不能丢**：布尔、数字、数组必须原样还原，
 * 否则导出会把 true 渲染成 "true"、把多选渲染成一串字符串。
 */
class AnswerItemAnswerRebuilderTest {

	private final AnswerItemAnswerRebuilder rebuilder = new AnswerItemAnswerRebuilder(new ObjectMapper());

	private AnswerItem item(String questionId, String optionId, String valueJson) {
		AnswerItem item = new AnswerItem();
		item.setQuestionId(questionId);
		item.setOptionId(optionId);
		item.setValueJson(valueJson);
		return item;
	}

	@Test
	@DisplayName("布尔/字符串/数组都按原类型还原")
	void typesArePreserved() {
		List<AnswerItem> items = Arrays.asList(item("q1", "o1", "true"), item("q1", "o2", "\"hello\""),
				item("q2", "o3", "[1,2]"), item("q3", "o4", "3.5"));
		LinkedHashMap<String, Object> answer = rebuilder.rebuild(items);

		Map<?, ?> q1 = (Map<?, ?>) answer.get("q1");
		assertEquals(Boolean.TRUE, q1.get("o1"));
		assertEquals("hello", q1.get("o2"));
		assertEquals(Arrays.asList(1, 2), ((Map<?, ?>) answer.get("q2")).get("o3"));
		assertEquals(3.5, ((Map<?, ?>) answer.get("q3")).get("o4"));
	}

	@Test
	@DisplayName("null 值保留占位（空答案行）")
	void nullValueIsKept() {
		LinkedHashMap<String, Object> answer = rebuilder.rebuild(Collections.singletonList(item("q1", "o1", null)));
		Map<?, ?> q1 = (Map<?, ?>) answer.get("q1");
		assertEquals(1, q1.size());
		assertNull(q1.get("o1"));
	}

	@Test
	@DisplayName("脏 JSON 退化成原字符串，不抛异常")
	void badJsonFallsBackToString() {
		LinkedHashMap<String, Object> answer = rebuilder.rebuild(Collections.singletonList(item("q1", "o1", "not-json")));
		assertEquals("not-json", ((Map<?, ?>) answer.get("q1")).get("o1"));
	}

	@Test
	@DisplayName("缺少题/选项 id 的行被跳过")
	void incompleteRowsAreSkipped() {
		AnswerItem noOption = item("q1", null, "true");
		AnswerItem noQuestion = item(null, "o1", "true");
		LinkedHashMap<String, Object> answer = rebuilder.rebuild(Arrays.asList(noOption, noQuestion));
		assertEquals(0, answer.size());
	}

}
