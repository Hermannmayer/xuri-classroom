package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerItem;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 把答卷的 answer JSON 展开成 t_answer_item（统计投影）。
 *
 * <p>
 * 真源永远是 {@code t_answer.answer}，这张投影表随时可以重建；交卷与回填都走同一个实现，
 * 保证两条路径产出的行完全一致。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AnswerItemProjector {

	/** 单次多值 INSERT 的行数上限：太大容易撞 max_allowed_packet，太小又起不到批量效果 */
	private static final int BATCH_SIZE = 500;

	private final AnswerItemMapper answerItemMapper;

	private final AnswerMapper answerMapper;

	/** 导出要用「值本身」重建 answer，用 JSON 存可以保留布尔/数字/数组等类型 */
	private final ObjectMapper objectMapper;

	/** 先删后插：重复提交、修改答案、回填重跑都会得到与真源一致结果 */
	public int rebuild(Answer answer) {
		if (answer == null || !StringUtils.hasText(answer.getId())) {
			return 0;
		}
		answerItemMapper.delete(Wrappers.<AnswerItem>lambdaQuery().eq(AnswerItem::getAnswerId, answer.getId()));
		Map<String, Object> payload = answer.getAnswer();
		if (payload == null || payload.isEmpty()) {
			markSynced(answer.getId());
			return 0;
		}
		Date now = new Date();
		List<AnswerItem> items = new ArrayList<>();
		for (Map.Entry<String, Object> entry : payload.entrySet()) {
			if (!(entry.getValue() instanceof Map)) {
				continue;
			}
			String questionId = entry.getKey();
			Map<?, ?> optionValues = (Map<?, ?>) entry.getValue();
			for (Map.Entry<?, ?> option : optionValues.entrySet()) {
				if (option.getKey() == null) {
					continue;
				}
				AnswerItem item = new AnswerItem();
				item.setId(UUID.randomUUID().toString());
				item.setAnswerId(answer.getId());
				item.setProjectId(answer.getProjectId());
				item.setQuestionId(questionId);
				item.setOptionId(String.valueOf(option.getKey()));
				item.setValueJson(serializeValue(option.getValue()));
				item.setCreateAt(now);
				items.add(item);
			}
		}
		for (int from = 0; from < items.size(); from += BATCH_SIZE) {
			answerItemMapper.batchInsert(items.subList(from, Math.min(from + BATCH_SIZE, items.size())));
		}
		markSynced(answer.getId());
		return items.size();
	}

	/** 值的序列化不能影响交卷：失败就退化成字符串，导出仍能显示原文 */
	private String serializeValue(Object value) {
		if (value == null) {
			return null;
		}
		try {
			return objectMapper.writeValueAsString(value);
		}
		catch (Exception e) {
			log.warn("答案值序列化失败，退化为字符串: value={}", value, e);
			try {
				return objectMapper.writeValueAsString(String.valueOf(value));
			}
			catch (Exception ignored) {
				return null;
			}
		}
	}

	private void markSynced(String answerId) {
		answerMapper.update(null, Wrappers.<Answer>lambdaUpdate().eq(Answer::getId, answerId)
				.set(Answer::getItemsSynced, Integer.valueOf(1)));
	}

}