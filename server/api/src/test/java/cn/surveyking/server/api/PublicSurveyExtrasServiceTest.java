package cn.surveyking.server.api;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.PublicExamRequest;
import cn.surveyking.server.impl.AnswerLookup;
import cn.surveyking.server.impl.AnswerServiceImpl;
import cn.surveyking.server.impl.DictItemServiceImpl;
import cn.surveyking.server.impl.ExamControlService;
import cn.surveyking.server.impl.PublicSurveyExtrasService;
import cn.surveyking.server.impl.WechatAccessGuard;
import cn.surveyking.server.service.AnonymousIdentityService;
import cn.surveyking.server.service.ProjectService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 公开成绩单的失败路径回归：项目不存在时回 4004/404，而不是 NPE 兜成 500。
 *
 * <p>
 * 与 {@link PublicQueryServiceTest} 同源：公开链接上的 {@code projectId} 不可信，
 * 直接解引用 {@code project.getId()} 就会 500。
 */
class PublicSurveyExtrasServiceTest {

	@Test
	@DisplayName("项目不存在 → ProjectNotFound(4004)，不是 NPE")
	void missingProjectIsProjectNotFound() {
		ProjectService projectService = mock(ProjectService.class);
		when(projectService.getProject("missing")).thenReturn(null);
		PublicSurveyExtrasService service = new PublicSurveyExtrasService(projectService, mock(AnswerServiceImpl.class),
				mock(DictItemServiceImpl.class), mock(ExamControlService.class), mock(WechatAccessGuard.class),
				mock(AnswerLookup.class), mock(ObjectMapper.class), mock(AnonymousIdentityService.class));
		PublicExamRequest request = new PublicExamRequest();
		request.setId("missing");
		request.setAnswerId("a1");
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service.loadExamResult(request));
		assertEquals(ErrorCode.ProjectNotFound, ex.getErrorCode());
	}

}
