package cn.surveyking.server.impl;

import cn.surveyking.server.mapper.AnswerMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;













@Component
@RequiredArgsConstructor
public class AnswerAttemptAllocator {

	private final AnswerMapper answerMapper;

	/**
	 * @return 下一次作答序号；没有历史答卷时从 0 开始
	 */
	public int next(String projectId, String createBy) {
		Integer max = answerMapper.selectMaxAttemptNo(projectId, createBy);
		return max == null ? 0 : max + 1;
	}

}
