package cn.surveyking.server.core.audit;

import cn.surveyking.server.domain.dto.AnswerGradeRequest;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.ProjectStatusRequest;
import cn.surveyking.server.domain.dto.RoleRequest;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerGrade;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.mapper.AnswerGradeMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.RoleMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;







class AuditDiffSupportTest {

	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final AnswerGradeMapper answerGradeMapper = mock(AnswerGradeMapper.class);

	private final ProjectMapper projectMapper = mock(ProjectMapper.class);

	private final RoleMapper roleMapper = mock(RoleMapper.class);

	private final AuditDiffSupport diffSupport = new AuditDiffSupport(answerMapper, answerGradeMapper, projectMapper,
			roleMapper);

	@Test
	void gradeSnapshotKeepsScoreBeforeAndAfter() {
		Answer answer = new Answer();
		answer.setId("a1");
		answer.setProjectId("p1");
		answer.setAnswererName("张三");
		answer.setExamScore(82.0);
		answer.setGradeStatus("pending");
		when(answerMapper.selectById("a1")).thenReturn(answer);
		when(answerGradeMapper.selectList(any())).thenReturn(List.of(grade("q1", 8.0, "太粗")));

		AnswerGradeRequest request = new AnswerGradeRequest();
		request.setAnswerId("a1");
		request.setItems(List.of(item("q1", 10.0, "好")));

		Map<String, Object> before = diffSupport.snapshot("ANSWER_GRADE", new Object[] { request });

		when(answerGradeMapper.selectList(any())).thenReturn(List.of(grade("q1", 10.0, "好")));
		answer.setExamScore(84.0);
		answer.setGradeStatus("graded");
		Map<String, Object> after = diffSupport.snapshot("ANSWER_GRADE", new Object[] { request });

		assertEquals(8.0, firstItem(before).get("score"));
		assertEquals("太粗", firstItem(before).get("comment"));
		assertEquals(10.0, firstItem(after).get("score"));
		assertEquals(82.0, before.get("examScore"));
		assertEquals(84.0, after.get("examScore"));
		assertEquals("graded", after.get("gradeStatus"));

		assertTrue(!before.toString().contains("张三"));

		assertEquals("a1", diffSupport.targetIdOf("ANSWER_GRADE", new Object[] { request }));
	}

	@Test
	void resetSnapshotListsQuestionsWhenRequestHasNone() {
		when(answerMapper.selectById("a1")).thenReturn(new Answer());
		when(answerGradeMapper.selectList(any())).thenReturn(List.of(grade("q1", 8.0, null), grade("q2", 5.0, null)));

		AnswerGradeRequest request = new AnswerGradeRequest();
		request.setAnswerId("a1");

		Map<String, Object> before = diffSupport.snapshot("ANSWER_GRADE_RESET", new Object[] { request });


		List<?> items = (List<?>) before.get("items");
		assertEquals(2, items.size());
	}

	@Test
	void answerDeleteSnapshotTurnsInvisible() {
		Answer answer = new Answer();
		answer.setId("a1");
		answer.setProjectId("p1");
		answer.setCreateBy("u1");
		answer.setExamScore(90.0);
		when(answerMapper.selectById("a1")).thenReturn(answer);

		AnswerRequest request = new AnswerRequest();
		request.setIds(List.of("a1"));

		Map<String, Object> before = diffSupport.snapshot("ANSWER_DELETE", new Object[] { request });
		assertEquals(true, before.get("visible"));
		assertEquals(1, before.get("count"));


		when(answerMapper.selectById("a1")).thenReturn(null);
		Map<String, Object> after = diffSupport.snapshot("ANSWER_DELETE", new Object[] { request });
		assertEquals(false, after.get("visible"));
		assertEquals("a1", diffSupport.targetIdOf("ANSWER_DELETE", new Object[] { request }));
	}

	@Test
	void projectStatusSnapshotKeepsStatus() {
		Project project = new Project();
		project.setId("p1");
		project.setName("保育员中级");
		project.setStatus(0);
		when(projectMapper.selectById("p1")).thenReturn(project);

		ProjectStatusRequest request = new ProjectStatusRequest();
		request.setId("p1");
		request.setStatus(1);

		Map<String, Object> before = diffSupport.snapshot("PROJECT_STATUS", new Object[] { request });
		project.setStatus(1);
		Map<String, Object> after = diffSupport.snapshot("PROJECT_STATUS", new Object[] { request });

		assertEquals(0, before.get("status"));
		assertEquals(1, after.get("status"));
		assertEquals("p1", diffSupport.targetIdOf("PROJECT_STATUS", new Object[] { request }));
	}

	@Test
	void roleSnapshotKeepsAuthority() {
		Role role = new Role();
		role.setId("r1");
		role.setCode("teacher");
		role.setAuthority("project:list,answer:grade");
		when(roleMapper.selectById("r1")).thenReturn(role);

		RoleRequest request = new RoleRequest();
		request.setId("r1");
		request.setAuthorities(List.of("project:list", "answer:grade", "answer:detail"));

		Map<String, Object> before = diffSupport.snapshot("SYSTEM_ROLE_UPDATE", new Object[] { request });
		role.setAuthority("project:list,answer:grade,answer:detail");
		Map<String, Object> after = diffSupport.snapshot("SYSTEM_ROLE_UPDATE", new Object[] { request });

		assertEquals("project:list,answer:grade", before.get("authority"));
		assertEquals("project:list,answer:grade,answer:detail", after.get("authority"));
	}

	@Test
	void ignoresActionsOutsideTheWhitelist() {
		AnswerRequest request = new AnswerRequest();
		request.setId("a1");


		assertNull(diffSupport.snapshot("ANSWER_UPDATE", new Object[] { request }));
		assertNull(diffSupport.targetIdOf("ANSWER_UPDATE", new Object[] { request }));
	}

	private static AnswerGrade grade(String questionId, Double score, String comment) {
		AnswerGrade grade = new AnswerGrade();
		grade.setQuestionId(questionId);
		grade.setScore(score);
		grade.setComment(comment);
		return grade;
	}

	private static AnswerGradeRequest.Item item(String questionId, Double score, String comment) {
		AnswerGradeRequest.Item item = new AnswerGradeRequest.Item();
		item.setQuestionId(questionId);
		item.setScore(score);
		item.setComment(comment);
		return item;
	}

	private static Map<?, ?> firstItem(Map<String, Object> snapshot) {
		return (Map<?, ?>) ((List<?>) snapshot.get("items")).get(0);
	}

}
