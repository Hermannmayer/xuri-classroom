package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.AuditAnswerTimelineView;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.AuditLogMapper;
import cn.surveyking.server.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import tools.jackson.databind.ObjectMapper;

import java.util.Date;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 答卷操作时间线的纯逻辑测试（Mapper 与权限闸门全部 mock）。
 *
 * <p>盯三件事：把 before/after 解析成对象而不是字符串、动作码翻译成中文、
 * 以及「只批改一道题」时把 questionId 提到行上（前端据此按题过滤）。
 */
class AnswerTimelineServiceImplTest {

	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final AuditLogMapper auditLogMapper = mock(AuditLogMapper.class);

	private final UserMapper userMapper = mock(UserMapper.class);

	private final AnswerAccessGuard answerAccessGuard = mock(AnswerAccessGuard.class);

	private final AnswerTimelineServiceImpl service = new AnswerTimelineServiceImpl(answerMapper, auditLogMapper,
			userMapper, answerAccessGuard, new ObjectMapper());

	@Test
	void mapsAuditRowsToTimelineRows() {
		when(answerMapper.selectById("a1")).thenReturn(answer());
		AuditLog gradeRow = new AuditLog();
		gradeRow.setAction("ANSWER_GRADE");
		gradeRow.setCreateBy("t1");
		gradeRow.setCreateAt(new Date(1_700_000_000_000L));
		gradeRow.setBeforeJson("{\"answerId\":\"a1\",\"examScore\":82.0,"
				+ "\"items\":[{\"questionId\":\"q1\",\"score\":8.0,\"comment\":null}]}");
		gradeRow.setAfterJson("{\"answerId\":\"a1\",\"examScore\":84.0,"
				+ "\"items\":[{\"questionId\":\"q1\",\"score\":10.0,\"comment\":\"好\"}]}");
		when(auditLogMapper.selectByTarget("a1", 200)).thenReturn(List.of(gradeRow));
		when(userMapper.selectBatchIds(any())).thenReturn(List.of(teacher()));

		List<AuditAnswerTimelineView> views = service.answerTimeline("a1");

		assertEquals(1, views.size());
		AuditAnswerTimelineView view = views.get(0);
		assertEquals("王老师", view.getOperator());
		assertEquals("批改答卷", view.getActionName());
		assertEquals("q1", view.getQuestionId());
		// before / after 是解析后的对象，前端不用再 JSON.parse
		assertEquals(82.0, ((Map<?, ?>) view.getBefore()).get("examScore"));
		assertEquals(10.0, firstItem(view.getAfter()).get("score"));
	}

	@Test
	void keepsBrokenSnapshotAsRawText() {
		when(answerMapper.selectById("a1")).thenReturn(answer());
		AuditLog row = new AuditLog();
		row.setAction("ANSWER_GRADE_RESET");
		row.setCreateBy("t1");
		// 历史半截 JSON：整条不能丢，按原文返回
		row.setBeforeJson("{\"items\":[{\"questionId\":\"q1\"");
		when(auditLogMapper.selectByTarget("a1", 200)).thenReturn(List.of(row));
		when(userMapper.selectBatchIds(any())).thenReturn(List.of(teacher()));

		List<AuditAnswerTimelineView> views = service.answerTimeline("a1");

		assertEquals(1, views.size());
		assertEquals("撤销批改", views.get(0).getActionName());
		assertTrue(views.get(0).getBefore() instanceof String);
		// 解析不出 items 就不要瞎猜题目 id
		assertEquals(null, views.get(0).getQuestionId());
	}

	@Test
	void returnsEmptyListWhenNoAuditRows() {
		when(answerMapper.selectById("a1")).thenReturn(answer());
		when(auditLogMapper.selectByTarget("a1", 200)).thenReturn(List.of());

		assertEquals(0, service.answerTimeline("a1").size());
	}

	@Test
	void deniesWhenAnswerNotAccessible() {
		when(answerMapper.selectById("a9")).thenReturn(null);
		doThrow(new AccessDeniedException("无权限访问该答案")).when(answerAccessGuard).assertAnswerAccess(null);

		assertThrows(AccessDeniedException.class, () -> service.answerTimeline("a9"));
	}

	private static Answer answer() {
		Answer answer = new Answer();
		answer.setId("a1");
		answer.setProjectId("p1");
		answer.setCreateBy("u1");
		return answer;
	}

	private static User teacher() {
		User user = new User();
		user.setId("t1");
		user.setName("王老师");
		return user;
	}

	private static Map<?, ?> firstItem(Object snapshot) {
		return (Map<?, ?>) ((List<?>) ((Map<?, ?>) snapshot).get("items")).get(0);
	}

}
