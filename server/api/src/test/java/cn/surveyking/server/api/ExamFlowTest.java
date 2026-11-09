package cn.surveyking.server.api;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.security.JwtTokenUtil;
import cn.surveyking.server.domain.dto.UserTokenView;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import javax.servlet.http.Cookie;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 答题全链路的端到端回归网：开始答题 → 暂存 → 交卷 → 统计。
 *
 * <p>
 * 这是拆 {@code AnswerServiceImpl} / {@code UserServiceImpl} 之前必须有的那张网。
 * 默认禁用，配了 {@code S2_TEST_DB_URL} 才跑；依赖测试库里的 {@code s2exam} 项目
 * （2 道题、status=1、exam 模式、无截止时间）。
 *
 * <p>
 * 统计步骤用真实 JWT（走 {@code JwtTokenFilter}）：MockMvc 的 {@code user(...)} 只写
 * SecurityContext，不经过过滤器链，实测会被 {@code @PreAuthorize} 拒绝。
 */
@EnabledIfEnvironmentVariable(named = "S2_TEST_DB_URL", matches = ".+")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExamFlowTest {

	private static final String PROJECT_ID = "s2exam";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JwtTokenUtil jwtTokenUtil;

	@Test
	@DisplayName("完整链路：开始答题 → 暂存 → 交卷 → 统计")
	void fullExamFlow() throws Exception {
		// 1. 开始答题（状态 / 截止时间 / 回收上限）
		mockMvc.perform(post("/api/public/validateProject").contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\":\"" + PROJECT_ID + "\",\"answer\":{}}")).andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value(200));

		// 2. 暂存
		mockMvc.perform(post("/api/public/tempSaveAnswer").contentType(MediaType.APPLICATION_JSON)
				.content("{\"projectId\":\"" + PROJECT_ID + "\",\"tempSave\":1,"
						+ "\"tempAnswer\":{\"q1\":{\"q1o1\":true}}}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200));

		// 3. 交卷
		MvcResult submit = mockMvc
				.perform(post("/api/public/saveAnswer")
						.with(user("tester").authorities(new SimpleGrantedAuthority("project:answer")))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"projectId\":\"" + PROJECT_ID + "\",\"tempSave\":0,"
								+ "\"answer\":{\"q1\":{\"q1o1\":true},\"q2\":{\"q2b1\":\"端到端\"}}}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200)).andReturn();
		String answerId = JsonPath.read(submit.getResponse().getContentAsString(), "$.data.answerId");
		org.junit.jupiter.api.Assertions.assertNotNull(answerId, "交卷应返回 answerId");

		// 4. 统计：真实 JWT 走过滤器链，确保 @PreAuthorize 生效
		UserTokenView tokenUser = new UserTokenView();
		tokenUser.setUserId("1457995481966747649");
		String token = jwtTokenUtil.generateAccessToken(tokenUser);
		mockMvc.perform(post("/api/report/statistics").cookie(new Cookie(AppConsts.TOKEN_NAME, token))
				.contentType(MediaType.APPLICATION_JSON).content("{\"id\":\"" + PROJECT_ID + "\"}"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200))
				.andExpect(jsonPath("$.data.count").isNumber());
	}

}
