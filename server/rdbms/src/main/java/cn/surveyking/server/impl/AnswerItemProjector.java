package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerItem;
import cn.surveyking.server.mapper.AnswerItemMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
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

	/** 先删后插：重复提交、修改答案、回填重跑都会得到与真源一致结果 */
	public int rebuild(Answer answer) {
		if (answer == null || !StringUtils.hasText(answer.getId())) {
			return 0;
		}
		answerItemMapper.delete(Wrappers.<AnswerItem>lambdaQuery().eq(AnswerItem::getAnswerId, answer.getId()));
		Map<String, Object> payload = answer.getAnswer();
		if (payload == null || payload.isEmpty()) {
			return 0;
		}
		Date now = new Date();
		List<AnswerItem> items = new ArrayList<>();
		for (Map.Entry<String, Object> entry : payload.entrySet()) {
			if (!(entry.getValue() instanceof Map)) {
				continue;
			}
			String questionId = entry.getKey();
			for (Object optionId : ((Map<?, ?>) entry.getValue()).keySet()) {
				if (optionId == null) {
					continue;
				}
				AnswerItem item = new AnswerItem();
				item.setId(UUID.randomUUID().toString());
				item.setAnswerId(answer.getId());
				item.setProjectId(answer.getProjectId());
				item.setQuestionId(questionId);
				item.setOptionId(String.valueOf(optionId));
				item.setCreateAt(now);
				items.add(item);
			}
		}
		for (int from = 0; from < items.size(); from += BATCH_SIZE) {
			answerItemMapper.batchInsert(items.subList(from, Math.min(from + BATCH_SIZE, items.size())));
		}
		return items.size();
	}

}