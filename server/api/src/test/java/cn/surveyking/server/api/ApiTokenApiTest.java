package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.ApiTokenRequest;
import cn.surveyking.server.domain.dto.ApiTokenView;
import cn.surveyking.server.service.ApiTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * API Token 接口的契约回归（前端 {@code ApiTokenPanel} 直接按这些路径与字段调用）。
 *
 * <p>钉住三件事：{@code data} 是数组（不是 {@code {list:[]}}）、签发响应多一个明文字段
 * {@code token}、列表项有 {@code maskedToken} 供前端展示。
 */
class ApiTokenApiTest {

	private final ApiTokenService apiTokenService = mock(ApiTokenService.class);

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new ApiTokenApi(apiTokenService))
				.addPlaceholderValue("api.prefix", "/api").build();
	}

	@Test
	@DisplayName("GET /api/system/api-token -> 数组，带 maskedToken")
	void list() throws Exception {
		ApiTokenView view = new ApiTokenView();
		view.setId("t1");
		view.setName("Claude Desktop");
		view.setMaskedToken("abcd****ef01");
		view.setRevoked(false);
		when(apiTokenService.list()).thenReturn(List.of(view));
		mockMvc.perform(get("/api/system/api-token")).andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Claude Desktop"))
				.andExpect(jsonPath("$[0].maskedToken").value("abcd****ef01"))
				.andExpect(jsonPath("$[0].revoked").value(false));
	}

	@Test
	@DisplayName("POST /api/system/api-token -> 明文只在这里出现一次")
	void create() throws Exception {
		ApiTokenView view = new ApiTokenView();
		view.setId("t2");
		view.setName("我的脚本");
		view.setToken("sk_0123456789abcdef0123456789abcdef");
		when(apiTokenService.issue(any(ApiTokenRequest.class))).thenReturn(view);
		mockMvc
				.perform(post("/api/system/api-token").contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"我的脚本\",\"expiresAt\":\"2099-12-31 23:59:59\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.id").value("t2"))
				.andExpect(jsonPath("$.token").value("sk_0123456789abcdef0123456789abcdef"));
	}

	@Test
	@DisplayName("POST /api/system/api-token/revoke -> 从 body 读 id")
	void revoke() throws Exception {
		mockMvc.perform(post("/api/system/api-token/revoke").contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\":\"t1\"}")).andExpect(status().isOk());
		verify(apiTokenService).revoke("t1");
	}

}
