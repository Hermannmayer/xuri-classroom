package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.AnswerItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 从 {@code t_answer_item} 重建一份答卷的 answer（S2-4）。
 *
 * <p>
 * 导出原来直接读 {@code t_answer.answer} 的整份 JSON；投影齐了之后只需要「题 → 选项 → 值」三列。
 * 值以 JSON 存储，重建时保留类型（布尔、数字、数组），避免把 {@code true} 渲染成字符串。
 */
@Component
@RequiredArgsConstructor
public class AnswerItemAnswerRebuilder {

	private final ObjectMapper objectMapper;

	public LinkedHashMap<String, Object> rebuild(List<AnswerItem> items) {
		LinkedHashMap<String, Object> answer = new LinkedHashMap<>();
		if (items == null) {
			return answer;
		}
		for (AnswerItem item : items) {
			if (item.getQuestionId() == null || item.getOptionId() == null) {
				continue;
			}
			@SuppressWarnings("unchecked")
			Map<String, Object> optionValues = (Map<String, Object>) answer.computeIfAbsent(item.getQuestionId(),
					key -> new LinkedHashMap<String, Object>());
			optionValues.put(item.getOptionId(), parse(item.getValueJson()));
		}
		return answer;
	}

	private Object parse(String json) {
		if (json == null) {
			return null;
		}
		try {
			return objectMapper.readValue(json, Object.class);
		}
		catch (Exception e) {
			// 历史/脏数据：按原字符串返回，导出至少能显示出内容
			return json;
		}
	}

}
