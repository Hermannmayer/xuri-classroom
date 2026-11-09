package cn.surveyking.server.impl;

import cn.surveyking.server.mapper.AnswerMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 交卷序号分配（S1-3）。
 *
 * <p>
 * {@code attempt_no} 是「同项目 + 同答题人的第几次作答」。它与
 * {@code (project_id, create_by, attempt_no)} 的唯一键一起，把交卷幂等从进程内 15 秒窗口
 * 升级成数据库约束：多实例并发提交时两个实例可能算出同一个序号，由唯一键裁决，只有一条落库。
 *
 * <p>
 * 计算时**包含已逻辑删除的答卷**（见 {@code AnswerMapper.xml}），否则删掉再交会重新拿到
 * 一个已经被占用的序号、撞唯一键。
 */
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
