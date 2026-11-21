package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.AnswerItem;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;








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

			return json;
		}
	}

}
