package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.ApiIdempotency;
import cn.surveyking.server.mapper.ApiIdempotencyMapper;
import cn.surveyking.server.service.ApiIdempotencyService;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.toolkit.LambdaUtils;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * MCP 写操作幂等的规则回归：命中回放、没命中记录、并发冲突不炸。
 *
 * <p>幂等做错的后果不是「重复一点数据」，而是「模型重试一次就多出一个项目 / 多导一次全班答卷」，
 * 所以这里的用例是验收项（计划 §7.5 第 3 条）。
 */
class ApiIdempotencyServiceImplTest {

	private final ApiIdempotencyMapper mapper = mock(ApiIdempotencyMapper.class);

	@BeforeAll
	static void initTableInfo() {
		TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
				ApiIdempotency.class);
		LambdaUtils.installCache(tableInfo);
	}

	@Test
	@DisplayName("命中：原样回放上次结果")
	void findReturnsStoredResult() {
		ApiIdempotency row = new ApiIdempotency();
		row.setResultJson("{\"id\":\"p1\"}");
		when(mapper.selectOne(any())).thenReturn(row);
		assertEquals("{\"id\":\"p1\"}", service().find("u1", "sk_project_create:k1"));
	}

	@Test
	@DisplayName("没命中：返回 null，不抛异常")
	void findReturnsNullWhenAbsent() {
		when(mapper.selectOne(any())).thenReturn(null);
		assertNull(service().find("u1", "k1"));
		// 用户 / 键为空时不查库：上面只查了一次（有效键那一次）
		assertNull(service().find("", "k1"));
		assertNull(service().find("u1", ""));
		verify(mapper, times(1)).selectOne(any());
	}

	@Test
	@DisplayName("记录：写入 user + key + 结果")
	void rememberInsertsRow() {
		service().remember("u1", "sk_project_create:k1", "{\"id\":\"p1\"}");
		ArgumentCaptor<ApiIdempotency> captor = ArgumentCaptor.forClass(ApiIdempotency.class);
		verify(mapper).insert(captor.capture());
		assertEquals("u1", captor.getValue().getUserId());
		assertEquals("sk_project_create:k1", captor.getValue().getKeyValue());
		assertEquals("{\"id\":\"p1\"}", captor.getValue().getResultJson());
	}

	@Test
	@DisplayName("记录：唯一键冲突（并发两路同时到达）不抛给调用方")
	void rememberIgnoresDuplicateKey() {
		when(mapper.insert(any(ApiIdempotency.class))).thenThrow(new DuplicateKeyException("uk_api_idem"));
		assertDoesNotThrow(() -> service().remember("u1", "k1", "{}"));
	}

	@Test
	@DisplayName("组合键：带工具名，且同一工具的不同键不会撞")
	void composeKeyIncludesToolName() {
		assertEquals("sk_project_create:k1", ApiIdempotencyService.composeKey("sk_project_create", "k1"));
		assertNotEquals(ApiIdempotencyService.composeKey("sk_project_create", "k1"),
				ApiIdempotencyService.composeKey("sk_project_update", "k1"));
	}

	@Test
	@DisplayName("组合键：超长时退化为哈希，仍在 varchar(128) 内且稳定")
	void composeKeyFallsBackToHash() {
		String key = "x".repeat(400);
		String composed = ApiIdempotencyService.composeKey("sk_project_create", key);
		assertTrue(composed.length() <= ApiIdempotencyService.MAX_KEY_LENGTH, composed);
		assertEquals(composed, ApiIdempotencyService.composeKey("sk_project_create", key));
		assertTrue(composed.startsWith("sk_project_create:h:"), composed);
	}

	private ApiIdempotencyServiceImpl service() {
		return new ApiIdempotencyServiceImpl(mapper);
	}

}