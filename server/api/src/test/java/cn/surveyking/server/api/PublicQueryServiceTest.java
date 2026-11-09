package cn.surveyking.server.api;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicQueryRequest;
import cn.surveyking.server.impl.PublicQueryService;
import cn.surveyking.server.impl.WechatAccessGuard;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ProjectService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.MessageSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 公开查询链接的失败路径回归。
 *
 * <p>
 * 2026-11-09 修掉的 bug：{@code getProjectAndQueryThenValidate} 直接对
 * {@code project.getSetting().getSubmittedSetting()} 解引用，项目不存在（或历史数据没有设置）时
 * 抛 NPE，被全局兜底成 HTTP 500「服务出了点问题」。公开查询应该统一回 7000「链接已失效」，
 * 既不泄露项目是否存在，也给前端一句可读提示。
 *
 * <p>
 * 纯 Mockito，不启动 Spring、不连库，因此没有 {@code S2_TEST_DB_URL} 也会跑。
 */
class PublicQueryServiceTest {

	private PublicQueryService service(ProjectView project) {
		ProjectService projectService = mock(ProjectService.class);
		when(projectService.getProject("missing")).thenReturn(project);
		return new PublicQueryService(projectService, mock(AnswerService.class), mock(WechatAccessGuard.class),
				mock(MessageSource.class));
	}

	private PublicQueryRequest request() {
		PublicQueryRequest request = new PublicQueryRequest();
		request.setId("missing");
		request.setResultId("q1");
		return request;
	}

	@Test
	@DisplayName("项目不存在 → 7000「链接已失效」，不是 NPE")
	void missingProjectIsQueryNotExist() {
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service(null).loadQuery(request()));
		assertEquals(ErrorCode.QueryNotExist, ex.getErrorCode());
	}

	@Test
	@DisplayName("项目没有 setting → 7000")
	void missingSettingIsQueryNotExist() {
		ProjectView project = new ProjectView();
		project.setId("missing");
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service(project).loadQuery(request()));
		assertEquals(ErrorCode.QueryNotExist, ex.getErrorCode());
	}

	@Test
	@DisplayName("项目没有 submittedSetting（历史数据）→ 7000")
	void missingSubmittedSettingIsQueryNotExist() {
		ProjectSetting setting = new ProjectSetting();
		setting.setSubmittedSetting(null);
		ProjectView project = new ProjectView();
		project.setId("missing");
		project.setSetting(setting);
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service(project).loadQuery(request()));
		assertEquals(ErrorCode.QueryNotExist, ex.getErrorCode());
	}

	@Test
	@DisplayName("getQueryResult 同样回 7000，不走 500")
	void getQueryResultWithMissingProjectIsQueryNotExist() {
		ErrorCodeException ex = assertThrows(ErrorCodeException.class, () -> service(null).getQueryResult(request()));
		assertEquals(ErrorCode.QueryNotExist, ex.getErrorCode());
	}

}
