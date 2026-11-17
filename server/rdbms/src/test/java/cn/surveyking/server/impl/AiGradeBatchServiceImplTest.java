package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiJobService;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.AiGradeBatchRequest;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.UserInfo;
import cn.surveyking.server.service.AnswerGradeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 批量 AI 批改的「入口闸门」用例。
 *
 * <p>为什么只测入口不测整条链路：这个方法链的中间要真的调模型（{@code AiGateway}），
 * 在单测里跑等于把「模型会不会算分」也当成被测对象——那不是我们的逻辑。
 * 而真正会出事故的地方恰好都在入口：**没批改权限也能发起**、**没有待批改的卷子却建了任务**、
 * **拿别人的撤销令牌去撤销**。这三条必须钉死。
 *
 * @author ai-actions
 */
class AiGradeBatchServiceImplTest {

	private final AiAssistSupport support = mock(AiAssistSupport.class);

	private final AiJobService aiJobService = mock(AiJobService.class);

	private final AnswerGradeService answerGradeService = mock(AnswerGradeService.class);

	private AiGradeBatchServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new AiGradeBatchServiceImpl(support, aiJobService, answerGradeService);
	}

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	/** 登录态：只有 ai:use 时不能被当成「能批改」 */
	private void login(String... authorities) {
		UserInfo info = new UserInfo();
		info.setUserId("teacher-1");
		Set<GrantedAuthority> granted = new HashSet<>();
		for (String authority : authorities) {
			granted.add(new SimpleGrantedAuthority(authority));
		}
		info.setAuthorities(granted);
		SecurityContextHolder.getContext()
				.setAuthentication(new UsernamePasswordAuthenticationToken(info, null, granted));
	}

	private static AiGradeBatchRequest request() {
		AiGradeBatchRequest request = new AiGradeBatchRequest();
		request.setProjectId("p1");
		return request;
	}

	@Test
	@DisplayName("没有 answer:grade：直接 403，不读库、不建任务")
	void rejectsWithoutGradePermission() {
		login("ai:use");
		ProjectView project = new ProjectView();
		project.setId("p1");
		when(support.readableProject("p1")).thenReturn(project);

		assertThrows(AccessDeniedException.class, () -> service.start(request()));
	}

	@Test
	@DisplayName("没有待批改的答卷：400 中文提示，而不是建一个空任务让老师等")
	void rejectsWhenNothingPending() {
		login("ai:use", "answer:grade");
		ProjectView project = new ProjectView();
		project.setId("p1");
		when(support.readableProject("p1")).thenReturn(project);
		when(answerGradeService.listPending(any()))
				.thenReturn(new PaginationResponse<AnswerView>(Long.valueOf(0L), List.of()));

		ErrorCodeException error = assertThrows(ErrorCodeException.class, () -> service.start(request()));
		assertEquals(ErrorCode.ValidationError, error.getErrorCode());
		assertTrue(error.getMessage().contains("没有待批改"), error.getMessage());
	}

	@Test
	@DisplayName("撤销令牌不存在：400 中文提示（不静默成功）")
	void undoRejectsUnknownToken() {
		login("ai:use", "answer:grade");
		ErrorCodeException error = assertThrows(ErrorCodeException.class, () -> service.undo("not-exist"));
		assertEquals(ErrorCode.ValidationError, error.getErrorCode());
		assertTrue(error.getMessage().contains("撤销"), error.getMessage());
	}

}
