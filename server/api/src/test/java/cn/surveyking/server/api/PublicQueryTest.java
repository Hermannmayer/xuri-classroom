package cn.surveyking.server.api;

import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 公开查询链路的回归网（拆 {@code PublicQueryService} 的保护）。
 *
 * <p>
 * 默认禁用，只有配置了 {@code S2_TEST_DB_URL} 才跑。依赖测试库里 {@code s2test} 项目的
 * setting 含一条公开查询配置（id = {@code pq1}）。
 *
 * <p>
 * 第三条用例覆盖 {@code findAnswerByQuery} 的真实查询路径：选项不是数值题时，
 * {@code buildLikeQueryConditionOfQuestion} 会把值加上引号（{@code {"q1o1":"true"}}），
 * 所以造出来的答卷 JSON 必须是字符串形式才能被 like 命中。
 */
@EnabledIfEnvironmentVariable(named = "S2_TEST_DB_URL", matches = ".+")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicQueryTest {

	private static final String PROJECT_ID = "s2test";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private AnswerMapper answerMapper;

	@Test
	@DisplayName("公开查询：正确的 resultId 返回查询表单")
	void loadQueryReturnsSchema() throws Exception {
		mockMvc.perform(post("/api/public/loadQuery").contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\":\"" + PROJECT_ID + "\",\"resultId\":\"pq1\"}")).andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value(200)).andExpect(jsonPath("$.data.schema.id").value("pq1"));
	}

	@Test
	@DisplayName("公开查询：没填任何查询条件返回「没有查询到结果」(7010)")
	void getQueryResultWithoutConditionsIsRejected() throws Exception {
		mockMvc.perform(post("/api/public/getQueryResult").contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\":\"" + PROJECT_ID + "\",\"resultId\":\"pq1\"}")).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value(7010));
	}

	@Test
	@DisplayName("公开查询：带 url 条件能查到答案（覆盖模糊匹配）")
	void getQueryResultFindsAnswerByUrlCondition() throws Exception {
		String answerId = "it-pq-" + UUID.randomUUID();
		Answer seed = new Answer();
		seed.setId(answerId);
		seed.setProjectId(PROJECT_ID);
		LinkedHashMap<String, Object> payload = new LinkedHashMap<String, Object>();
		LinkedHashMap<String, Object> q1 = new LinkedHashMap<String, Object>();
		// 注意：值是字符串，与 buildLikeQueryConditionOfQuestion 生成的 {"q1o1":"true"} 对齐
		q1.put("q1o1", "true");
		payload.put("q1", q1);
		seed.setAnswer(payload);
		seed.setItemsSynced(Integer.valueOf(0));
		answerMapper.insert(seed);
		try {
			String body = mockMvc
					.perform(post("/api/public/getQueryResult").contentType(MediaType.APPLICATION_JSON)
							.content("{\"id\":\"" + PROJECT_ID + "\",\"resultId\":\"pq1\",\"query\":{\"q1o1\":\"true\"}}"))
					.andReturn().getResponse().getContentAsString();
			System.out.println("[PublicQueryTest] response=" + body);
			org.junit.jupiter.api.Assertions.assertTrue(body.contains("\"code\":200"),
					"期望查到结果，实际响应：" + body);
		}
		finally {
			answerMapper.deleteById(answerId);
		}
	}

	@Test
	@DisplayName("公开查询：未知 resultId 返回「链接已失效」(7000)")
	void unknownResultIdIsRejected() throws Exception {
		mockMvc.perform(post("/api/public/loadQuery").contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\":\"" + PROJECT_ID + "\",\"resultId\":\"not-exists\"}")).andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value(7000));
	}

}
