package cn.surveyking.server.core.audit;

import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.mapper.AuditLogMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;








class McpAuditSourceTest {

	private final AuditLogMapper auditLogMapper = mock(AuditLogMapper.class);

	private final AuditRecorder auditRecorder = new AuditRecorder(auditLogMapper, new ObjectMapper());

	@AfterEach
	void clearContext() {
		RequestContextHolder.resetRequestAttributes();
	}

	@Test
	@DisplayName("POST /mcp -> source=mcp")
	void bareMcpPath() {
		request("POST", "/mcp");
		auditRecorder.record("MCP_SK_PROJECT_CREATE", "p1", "tool=sk_project_create", true, null);
		assertEquals("mcp", capture().getSource());
	}

	@Test
	@DisplayName("POST /api/mcp/... -> source=mcp（老写法继续认）")
	void apiPrefixedMcpPath() {
		request("POST", "/api/mcp/tools/call");
		auditRecorder.record("MCP_SK_PROJECT_CREATE", "p1", "tool=sk_project_create", true, null);
		assertEquals("mcp", capture().getSource());
	}

	@Test
	@DisplayName("POST /api/project/create -> 仍是 web，不要误判成 mcp")
	void webPathStaysWeb() {
		request("POST", "/api/project/create");
		auditRecorder.record("PROJECT_CREATE", "p1", "新建", true, null);
		assertEquals("web", capture().getSource());
	}

	private void request(String method, String uri) {
		MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
		RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
	}

	private AuditLog capture() {
		ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
		verify(auditLogMapper).insert(captor.capture());
		return captor.getValue();
	}

}
