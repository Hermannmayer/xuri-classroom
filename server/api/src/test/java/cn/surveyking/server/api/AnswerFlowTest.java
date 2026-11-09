package cn.surveyking.server.api;

import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerItem;
import cn.surveyking.server.impl.AnswerItemProjector;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Service 层的回归网：交卷投影、统计口径、统计权限。
 *
 * <p>
 * 默认**不跑**：只有显式提供测试库时才启用（{@code @EnabledIfEnvironmentVariable}），
 * 避免在没有 MySQL 的机器/CI 上把构建拖红。
 *
 * <p>
 * 启用方式：设置 {@code S2_TEST_DB_URL} / {@code S2_TEST_DB_USER} / {@code S2_TEST_DB_PASSWORD}
 * 三个环境变量指向一个**隔离的测试库**（绝不能指向生产库），然后执行
 * {@code ./gradlew :api:test --tests '*AnswerFlowTest'}。
 * 具体连接串与口令由本地环境提供，**不写进仓库**。
 *
 * <p>
 * 依赖测试库里存在 {@code s2test} 项目（种子卷）。断言用「实际答卷数」而不是写死的数字，
 * 数据量变了也不会误红。
 */
@EnabledIfEnvironmentVariable(named = "S2_TEST_DB_URL", matches = ".+")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AnswerFlowTest {

	private static final String PROJECT_ID = "s2test";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private AnswerItemProjector projector;

	@Autowired
	private AnswerMapper answerMapper;

	@Autowired
	private AnswerItemMapper itemMapper;

	@Test
	@DisplayName("匿名调统计接口被拒（统计已从 /api/public 移到报表域）")
	void statisticsRejectsAnonymous() throws Exception {
		mockMvc.perform(post("/api/report/statistics").contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\":\"" + PROJECT_ID + "\"}")).andExpect(result -> {
					int httpStatus = result.getResponse().getStatus();
					String body = result.getResponse().getContentAsString();
					boolean rejected = httpStatus == 401 || httpStatus == 403 || body.contains("\"code\":401")
							|| body.contains("\"code\":403");
					assertTrue(rejected, "匿名访问统计应被拒绝，实际 status=" + httpStatus + " body=" + body);
				});
	}

	@Test
	@WithMockUser(username = "it", authorities = { "project:report" })
	@DisplayName("统计返回的答卷数与该场实际答卷数一致")
	void statisticsMatchAnswers() throws Exception {
		long expected = answerMapper.selectCount(Wrappers.<Answer>lambdaQuery().eq(Answer::getProjectId, PROJECT_ID)
				.isNotNull(Answer::getAnswer));
		mockMvc.perform(post("/api/report/statistics").contentType(MediaType.APPLICATION_JSON)
				.content("{\"id\":\"" + PROJECT_ID + "\"}")).andExpect(status().isOk())
				.andExpect(jsonPath("$.code").value(200))
				.andExpect(jsonPath("$.data.count").value((int) expected));
	}

	@Test
	@DisplayName("投影重建幂等：重复 rebuild 不产生重复行，并置 items_synced")
	void rebuildIsIdempotent() {
		Answer answer = new Answer();
		answer.setId("it-" + UUID.randomUUID());
		answer.setProjectId(PROJECT_ID);
		LinkedHashMap<String, Object> payload = new LinkedHashMap<String, Object>();
		LinkedHashMap<String, Object> first = new LinkedHashMap<String, Object>();
		first.put("q1o1", Boolean.TRUE);
		first.put("q1o2", Boolean.TRUE);
		payload.put("q1", first);
		answer.setAnswer(payload);
		answer.setItemsSynced(Integer.valueOf(0));
		answerMapper.insert(answer);
		try {
			projector.rebuild(answer);
			long afterFirst = itemMapper.selectCount(
					Wrappers.<AnswerItem>lambdaQuery().eq(AnswerItem::getAnswerId, answer.getId()));
			projector.rebuild(answer);
			long afterSecond = itemMapper.selectCount(
					Wrappers.<AnswerItem>lambdaQuery().eq(AnswerItem::getAnswerId, answer.getId()));
			assertEquals(2, afterFirst, "一条多选题的两个选项应展开成两行");
			assertEquals(afterFirst, afterSecond, "重复重建不应产生重复行");
			assertEquals(1, answerMapper.selectById(answer.getId()).getItemsSynced().intValue(), "同步标记应置 1");
		}
		finally {
			itemMapper.delete(Wrappers.<AnswerItem>lambdaQuery().eq(AnswerItem::getAnswerId, answer.getId()));
			answerMapper.deleteById(answer.getId());
		}
	}

}
