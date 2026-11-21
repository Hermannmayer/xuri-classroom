package cn.surveyking.server.core.audit;

import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.mapper.AuditLogMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;





class AuditRecorderTest {

	private final AuditLogMapper auditLogMapper = mock(AuditLogMapper.class);

	private final ObjectMapper objectMapper = new ObjectMapper();

	private final AuditRecorder auditRecorder = new AuditRecorder(auditLogMapper, objectMapper);

	@AfterEach
	void clearContext() {
		MDC.clear();
		RequestContextHolder.resetRequestAttributes();
	}

	@Test
	void keepsSmallSnapshotAsIs() {
		Map<String, Object> before = new LinkedHashMap<>();
		before.put("examScore", 82.0);
		before.put("items", java.util.List.of(Map.of("questionId", "q1", "score", 8.0)));

		auditRecorder.recordWithDiff("ANSWER_GRADE", "answer-1", before, Map.of("examScore", 84.0));

		AuditLog entry = capture();
		assertEquals("ANSWER_GRADE", entry.getAction());
		assertEquals("answer-1", entry.getTargetId());
		Map<?, ?> parsed = objectMapper.readValue(entry.getBeforeJson(), Map.class);
		assertEquals(82.0, parsed.get("examScore"));
		assertEquals(84.0, objectMapper.readValue(entry.getAfterJson(), Map.class).get("examScore"));
	}

	@Test
	void truncatesOversizedSnapshotButKeepsItParsable() {

		String comment = "答".repeat(2000);
		auditRecorder.recordWithDiff("ANSWER_GRADE", "answer-1", Map.of("comment", comment), null);

		AuditLog entry = capture();
		String beforeJson = entry.getBeforeJson();
		assertTrue(beforeJson.getBytes(StandardCharsets.UTF_8).length <= AuditRecorder.SNAPSHOT_MAX_BYTES,
				"截断后不应超过 2KB，实际 " + beforeJson.getBytes(StandardCharsets.UTF_8).length);

		Map<?, ?> parsed = objectMapper.readValue(beforeJson, Map.class);
		assertEquals(true, parsed.get("_truncated"));
		assertTrue(((Number) parsed.get("_bytes")).intValue() > AuditRecorder.SNAPSHOT_MAX_BYTES);
		String preview = String.valueOf(parsed.get("_preview"));
		assertTrue(preview.startsWith("{\"comment\":\"答答"));
		assertNull(entry.getAfterJson());
	}

	@Test
	void marksMcpSourceFromUri() {
		request("POST", "/api/mcp/tools/call");

		auditRecorder.record("ANSWER_GRADE", "answer-1", "批改", true, null);

		assertEquals("mcp", capture().getSource());
	}

	@Test
	void marksWebSourceAndReadsRequestIdHeader() {
		MockHttpServletRequest request = request("POST", "/api/answer/grade");
		request.addHeader("X-Request-Id", "req-42");

		auditRecorder.record("ANSWER_GRADE", "answer-1", "批改", true, null);

		AuditLog entry = capture();
		assertEquals("web", entry.getSource());
		assertEquals("req-42", entry.getRequestId());
	}

	@Test
	void readsRequestIdFromMdcBeforeHeader() {
		MockHttpServletRequest request = request("POST", "/api/answer/grade");
		request.addHeader("X-Request-Id", "from-header");
		MDC.put("requestId", "from-mdc");

		auditRecorder.record("ANSWER_GRADE", "answer-1", "批改", true, null);

		assertEquals("from-mdc", capture().getRequestId());
	}

	@Test
	void leavesSourceNullWithoutRequestContext() {

		auditRecorder.record("AUTO_PURGE_ANONYMOUS", null, null, true, null);

		AuditLog entry = capture();
		assertNull(entry.getSource());
		assertNull(entry.getRequestId());
	}

	private MockHttpServletRequest request(String method, String uri) {
		MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
		return request;
	}

	private AuditLog capture() {
		ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
		verify(auditLogMapper).insert(captor.capture());
		return captor.getValue();
	}

}
