package cn.surveyking.server.mcp;

import cn.surveyking.server.domain.dto.DownloadQuery;
import cn.surveyking.server.impl.AnswerAccessGuard;
import cn.surveyking.server.service.AnswerPdfJobService;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.ProjectService;
import cn.surveyking.server.service.ReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import jakarta.validation.ValidationException;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * MCP 导出工具的「导出范围 + 权限」口径：必须和 HTTP 导出接口
 * （{@code AnswerExportApi#createPdfJob}）完全一致。
 *
 * <p>
 * 起因：MCP 这边以前强制要求 classId，于是「勾选几份导出」和「整卷导出」在 MCP 里根本没法做，
 * 而网页端一直支持——同一个后端两套口径，模型照着网页端的说法调用只会一直报错。
 *
 * <p>
 * 这里盯两件事，且只盯这两件：
 * <ul>
 * <li>没有 classId 也能建任务（ids 勾选 / 整卷）；</li>
 * <li>没有 classId 时<b>必须</b>过项目级闸门（项目所有者 / 协作者 / 管理员），
 * 否则任何持 answer:export 的令牌都能把整场答卷打包带走。</li>
 * </ul>
 */
class McpToolsExportTest {

	private final ProjectService projectService = mock(ProjectService.class);

	private final ReportService reportService = mock(ReportService.class);

	private final AnswerService answerService = mock(AnswerService.class);

	private final AnswerPdfJobService pdfJobService = mock(AnswerPdfJobService.class);

	private final ClassService classService = mock(ClassService.class);

	private final AnswerAccessGuard answerAccessGuard = mock(AnswerAccessGuard.class);

	private McpTools tools;

	@BeforeEach
	void setUp() {
		tools = new McpTools(projectService, reportService, answerService, pdfJobService, classService, answerAccessGuard);
	}

	@Test
	@DisplayName("无 classId + ids（勾选导出）：不再被「必须 classId」拦下，改查项目级权限")
	void exportsSelectedAnswersWithoutClassId() {
		when(pdfJobService.createJob(any(DownloadQuery.class))).thenReturn("job-1");
		DownloadQuery query = new DownloadQuery();
		query.setProjectId("p1");
		query.setIds(List.of("a1", "a2"));

		Map<String, Object> result = tools.exportCreate(query);

		assertEquals("job-1", result.get("jobId"));
		assertNull(query.getClassId());
		assertEquals(List.of("a1", "a2"), query.getIds(), "ids 要原样交给导出任务");
		verify(answerAccessGuard).assertProjectAccess("p1");
		verify(classService, never()).assertVisible(anyString());
	}

	@Test
	@DisplayName("无 classId 无 ids（整卷）且非协作者：项目级闸门拒掉，任务一份都不建")
	void wholeExamRequiresProjectAccess() {
		doThrow(new AccessDeniedException("无权限访问该问卷答案")).when(answerAccessGuard).assertProjectAccess("p1");
		DownloadQuery query = new DownloadQuery();
		query.setProjectId("p1");

		AccessDeniedException error = assertThrows(AccessDeniedException.class, () -> tools.exportCreate(query));

		assertTrue(error.getMessage().contains("无权限"), error.getMessage());
		verify(pdfJobService, never()).createJob(any(DownloadQuery.class));
	}

	@Test
	@DisplayName("有 classId：仍按班级可见性校验，不再多查项目级权限")
	void classScopedExportChecksClassVisibility() {
		when(pdfJobService.createJob(any(DownloadQuery.class))).thenReturn("job-2");
		DownloadQuery query = new DownloadQuery();
		query.setProjectId("p1");
		query.setClassId("c1");

		Map<String, Object> result = tools.exportCreate(query);

		assertEquals("job-2", result.get("jobId"));
		verify(classService).assertVisible("c1");
		verify(answerAccessGuard, never()).assertProjectAccess(anyString());
		// 类型缺省补成成绩单：老调用方只传 classId 的行为不变
		assertEquals(DownloadQuery.DownloadType.answerPdf, query.getType());
	}

	@Test
	@DisplayName("班级看不见：老师导不了别人的班")
	void classNotVisibleRejected() {
		doThrow(new AccessDeniedException("无权限访问该班级")).when(classService).assertVisible("c2");
		DownloadQuery query = new DownloadQuery();
		query.setProjectId("p1");
		query.setClassId("c2");

		assertThrows(AccessDeniedException.class, () -> tools.exportCreate(query));
		verify(pdfJobService, never()).createJob(any(DownloadQuery.class));
	}

	@Test
	@DisplayName("缺 projectId：中文报错，不建任务")
	void missingProjectIdRejected() {
		assertThrows(ValidationException.class, () -> tools.exportCreate(new DownloadQuery()));
		verify(pdfJobService, never()).createJob(any(DownloadQuery.class));
	}

}
