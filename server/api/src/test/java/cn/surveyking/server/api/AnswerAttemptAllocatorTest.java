package cn.surveyking.server.api;

import cn.surveyking.server.impl.AnswerAttemptAllocator;
import cn.surveyking.server.mapper.AnswerMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * S1-3 回归：作答序号分配。
 *
 * <p>
 * 只测分配规则本身（纯 Mockito，不连库）；唯一键冲突后的回读逻辑在
 * {@code AnswerServiceImpl#createAnswer}，需要数据库才能覆盖。
 */
class AnswerAttemptAllocatorTest {

	private AnswerAttemptAllocator allocator(AnswerMapper mapper) {
		return new AnswerAttemptAllocator(mapper);
	}

	@Test
	@DisplayName("没有历史答卷 → 从 0 开始")
	void firstAttemptIsZero() {
		AnswerMapper mapper = mock(AnswerMapper.class);
		when(mapper.selectMaxAttemptNo("p1", "u1")).thenReturn(-1);
		assertEquals(0, allocator(mapper).next("p1", "u1"));
	}

	@Test
	@DisplayName("已有第 2 次（序号 2）→ 下一次是 3")
	void incrementsAfterExistingAttempts() {
		AnswerMapper mapper = mock(AnswerMapper.class);
		when(mapper.selectMaxAttemptNo("p1", "u1")).thenReturn(2);
		assertEquals(3, allocator(mapper).next("p1", "u1"));
	}

	@Test
	@DisplayName("mapper 返回 null（空表/无匹配）→ 当作没有历史")
	void nullMeansNoHistory() {
		AnswerMapper mapper = mock(AnswerMapper.class);
		when(mapper.selectMaxAttemptNo("p1", null)).thenReturn(null);
		assertEquals(0, allocator(mapper).next("p1", null));
	}

}
