package cn.surveyking.server.api;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.mvc.advice.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.ValidationException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * S3-7 回归网：HTTP 状态码必须与 {@code body.code} 的语义对齐。
 *
 * <p>
 * 不启动 Spring 上下文、不连库：standalone MockMvc + 真实的 {@link GlobalExceptionHandler}，
 * 因此没配 {@code S2_TEST_DB_URL} 的机器上也会跑。
 */
class ErrorStatusTest {

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new ProbeController())
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	@DisplayName("缺少请求参数 → 400 + code 400")
	void missingParameterIsBadRequest() throws Exception {
		mockMvc.perform(get("/probe/missing")).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value(400));
	}

	@Test
	@DisplayName("校验异常 → 400 + code 400")
	void validationIsBadRequest() throws Exception {
		mockMvc.perform(get("/probe/validation")).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value(400));
	}

	@Test
	@DisplayName("AccessDenied → 403 + code 403，且保留可读原因")
	void accessDeniedIsForbidden() throws Exception {
		mockMvc.perform(get("/probe/denied")).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value(403)).andExpect(jsonPath("$.message").value("无权访问"));
	}

	@Test
	@DisplayName("业务码 PermVerifyFailed(4006) → 403，body 仍是业务码")
	void permVerifyFailedIsForbidden() throws Exception {
		mockMvc.perform(get("/probe/perm")).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value(4006));
	}

	@Test
	@DisplayName("业务码 ProjectNotFound(4004) → 404，body 仍是业务码")
	void projectNotFoundIsNotFound() throws Exception {
		mockMvc.perform(get("/probe/notfound")).andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value(4004));
	}

	@Test
	@DisplayName("其余业务码（如 SurveySubmitted 4012）→ 400")
	void otherBusinessCodeIsBadRequest() throws Exception {
		mockMvc.perform(get("/probe/business")).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value(4012));
	}

	@Test
	@DisplayName("未预期异常 → 500 + code 500")
	void unexpectedIsInternalError() throws Exception {
		mockMvc.perform(get("/probe/boom")).andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.code").value(500));
	}

	@Test
	@DisplayName("方法不支持 → 405")
	void methodNotAllowed() throws Exception {
		mockMvc.perform(post("/probe/missing")).andExpect(status().isMethodNotAllowed())
				.andExpect(jsonPath("$.code").value(405));
	}

	@RestController
	@RequestMapping("/probe")
	static class ProbeController {

		@GetMapping("/missing")
		String missing(@RequestParam String name) {
			return name;
		}

		@GetMapping("/validation")
		String validation() {
			throw new ValidationException("bad");
		}

		@GetMapping("/denied")
		String denied() {
			throw new AccessDeniedException("无权访问");
		}

		@GetMapping("/perm")
		String perm() {
			throw new ErrorCodeException(ErrorCode.PermVerifyFailed);
		}

		@GetMapping("/notfound")
		String notfound() {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}

		@GetMapping("/business")
		String business() {
			throw new ErrorCodeException(ErrorCode.SurveySubmitted);
		}

		@GetMapping("/boom")
		String boom() {
			throw new IllegalStateException("boom");
		}
	}

}
