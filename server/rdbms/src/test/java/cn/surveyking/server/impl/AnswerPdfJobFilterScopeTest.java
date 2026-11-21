package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.DownloadQuery;
import cn.surveyking.server.domain.mapper.AnswerViewMapper;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.SysInfoMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.storage.StorageProperties;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.AbstractWrapper;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.toolkit.LambdaUtils;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Method;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;















class AnswerPdfJobFilterScopeTest {


	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final AnswerPdfJobServiceImpl service = new AnswerPdfJobServiceImpl(answerMapper,
			mock(AnswerViewMapper.class), mock(ProjectMapper.class), mock(DeptMapper.class), mock(UserMapper.class),
			mock(SysInfoMapper.class), mock(FileService.class), mock(StorageProperties.class),
			mock(AnswerAccessGuard.class));


	private LambdaQueryWrapper<Answer> lastWrapper;

	/** 单测不启动 MyBatis，Lambda 缓存是空的：Answer::getGradeStatus 解析不出列名 */
	@BeforeAll
	static void initTableInfo() {
		TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
				Answer.class);
		LambdaUtils.installCache(tableInfo);
	}

	/** ====== DTO → 任务快照 ====== */

	@Test
	@DisplayName("导出请求 → 任务快照：批改状态 / 姓名 / 分数段 / 仅实名 一个都不许漏拷")
	void specKeepsEveryFilterField() {
		DownloadQuery query = new DownloadQuery();
		query.setProjectId("p1");
		query.setClassId("c1");
		query.setGradeStatus("pending");
		query.setCreateByName(" 王小明 ");
		query.setMinScore(Double.valueOf(60));
		query.setMaxScore(Double.valueOf(89.5));
		query.setIncludeAnonymous(Boolean.FALSE);

		AnswerPdfJobServiceImpl.ExportSpec spec = AnswerPdfJobServiceImpl.specOf(query,
				List.of(DownloadQuery.DownloadType.answerPdf));


		assertEquals("pending", spec.getGradeStatus());
		assertEquals(" 王小明 ", spec.getCreateByName());
		assertEquals(Double.valueOf(60), spec.getMinScore());
		assertEquals(Double.valueOf(89.5), spec.getMaxScore());
		assertEquals(Boolean.FALSE, spec.getIncludeAnonymous());
		assertEquals("c1", spec.getClassId());
		assertEquals(List.of(DownloadQuery.DownloadType.answerPdf), spec.getOutputs());

		assertTrue(spec.isIncludeImages());
	}

	/** ====== 筛选条件进 SQL ====== */

	@Test
	@DisplayName("批改状态：进 SQL 的是 GRADE_STATUS = ?，绑定参数就是界面选中的那一档")
	void gradeStatusReachesSql() throws Exception {
		String sql = sql(wrapperOf(spec -> spec.gradeStatus("pending")));

		assertTrue(sql.contains("grade_status = "), sql);
		assertTrue(params().containsValue("pending"), params().toString());
	}

	@Test
	@DisplayName("批改状态：空串与 null 一样算「不限」，不能变成 grade_status = ''")
	void blankGradeStatusAddsNoCondition() throws Exception {
		assertFalse(sql(wrapperOf(spec -> spec.gradeStatus(""))).contains("grade_status"));
		assertFalse(sql(wrapperOf(spec -> spec.gradeStatus(null))).contains("grade_status"));
	}

	@Test
	@DisplayName("姓名：ANSWERER_NAME LIKE 与账号名反查两头都查，两条用括号 OR 成一个整体")
	void createByNameSearchesBothPaths() throws Exception {
		String sql = sql(wrapperOf(spec -> spec.createByName("王小明")));

		assertTrue(sql.contains("answerer_name like"), sql);

		assertTrue(sql.contains("create_by in (select id from t_user where name like"), sql);
		assertTrue(params().containsValue("%王小明%"), params().toString());

		int nameAt = sql.indexOf("answerer_name like");
		assertTrue(nameAt > 0, sql);
		String before = sql.substring(0, nameAt).trim();
		assertEquals("(", before.substring(before.length() - 1), sql);

		assertTrue(sql.toLowerCase(Locale.ROOT).contains(" or "), sql);
	}

	@Test
	@DisplayName("姓名：搜索框里的 % 和 _ 按字面量匹配（与列表同一套转义），不能变成「匹配所有人」")
	void createByNameEscapesLikeWildcards() throws Exception {
		sql(wrapperOf(spec -> spec.createByName("张_%")));


		assertTrue(params().containsValue("%张\\_\\%%"), params().toString());
	}

	@Test
	@DisplayName("分数段：EXAM_SCORE >= / <= 是闭区间（写成开区间会漏掉正好 60 分及格的人）")
	void scoreRangeUsesInclusiveBounds() throws Exception {
		String sql = sql(wrapperOf(spec -> {
			spec.minScore(Double.valueOf(60));
			spec.maxScore(Double.valueOf(89.5));
		}));

		assertTrue(sql.contains("exam_score >= "), sql);
		assertTrue(sql.contains("exam_score <= "), sql);
		assertFalse(sql.contains("exam_score > "), sql);
		assertFalse(sql.contains("exam_score < "), sql);
		assertTrue(params().containsValue(Double.valueOf(60)), params().toString());
		assertTrue(params().containsValue(Double.valueOf(89.5)), params().toString());
	}

	@Test
	@DisplayName("分数段：只给一边就只加一边（另一边不能凭空变成 0 / 100）")
	void scoreBoundsAreIndependent() throws Exception {
		String lowerOnly = sql(wrapperOf(spec -> spec.minScore(Double.valueOf(60))));
		assertTrue(lowerOnly.contains("exam_score >= "), lowerOnly);
		assertFalse(lowerOnly.contains("exam_score <="), lowerOnly);

		String upperOnly = sql(wrapperOf(spec -> spec.maxScore(Double.valueOf(59))));
		assertTrue(upperOnly.contains("exam_score <= "), upperOnly);
		assertFalse(upperOnly.contains("exam_score >="), upperOnly);
	}

	@Test
	@DisplayName("仅实名：includeAnonymous=false 才加 IS_ANONYMOUS = 0；null / true 一律不过滤")
	void anonymousExcludedOnlyWhenExplicitlyFalse() throws Exception {
		String excluded = sql(wrapperOf(spec -> spec.includeAnonymous(Boolean.FALSE)));
		assertTrue(excluded.contains("is_anonymous = "), excluded);


		assertFalse(sql(wrapperOf(spec -> spec.includeAnonymous(null))).contains("is_anonymous"));
		assertFalse(sql(wrapperOf(spec -> spec.includeAnonymous(Boolean.TRUE))).contains("is_anonymous"));
	}

	/** ====== 不受影响的部分 ====== */

	@Test
	@DisplayName("什么都没传：筛选条件一条都不加，取数范围与以前完全一样")
	void emptyFiltersAddNoCondition() throws Exception {
		String sql = sql(wrapperOf(spec -> {
		})).toLowerCase(Locale.ROOT);

		assertFalse(sql.contains("grade_status"), sql);
		assertFalse(sql.contains("answerer_name"), sql);
		assertFalse(sql.contains("t_user"), sql);
		assertFalse(sql.contains("exam_score"), sql);
		assertFalse(sql.contains("is_anonymous"), sql);

		assertTrue(sql.contains("project_id"), sql);
		assertTrue(sql.contains("temp_save"), sql);
	}

	@Test
	@DisplayName("既有范围照旧：ids / 轮次 / 时间窗都还在 SQL 里（新条件不能把它们挤掉）")
	void existingScopeStillApplied() throws Exception {
		String sql = sql(wrapperOf(spec -> spec.ids(List.of("a1")).attemptNo(Integer.valueOf(1))
				.startTime(new Date(1_700_000_000_000L)).endTime(new Date(1_700_100_000_000L))));


		assertTrue(sql.toLowerCase(Locale.ROOT).contains("id in "), sql);
		assertTrue(sql.contains("attempt_no = "), sql);
		assertTrue(sql.contains("create_at > "), sql);
		assertTrue(sql.contains("create_at < "), sql);
	}



	/** 跑一次 countAnswers（私有）并把交给 Mapper 的 Wrapper 抓下来 */
	@SuppressWarnings({ "unchecked", "rawtypes" })
	private LambdaQueryWrapper<Answer> wrapperOf(Consumer<AnswerPdfJobServiceImpl.ExportSpec> customizer)
			throws Exception {
		AnswerPdfJobServiceImpl.ExportSpec spec = new AnswerPdfJobServiceImpl.ExportSpec().projectId("p1");
		customizer.accept(spec);
		when(answerMapper.selectCount(any())).thenReturn(Long.valueOf(0));
		Method method = AnswerPdfJobServiceImpl.class.getDeclaredMethod("countAnswers",
				AnswerPdfJobServiceImpl.ExportSpec.class);
		method.setAccessible(true);
		method.invoke(service, spec);

		ArgumentCaptor<Wrapper> captor = ArgumentCaptor.forClass(Wrapper.class);
		verify(answerMapper, atLeastOnce()).selectCount(captor.capture());
		LambdaQueryWrapper<Answer> wrapper = (LambdaQueryWrapper<Answer>) captor.getValue();
		lastWrapper = wrapper;
		return wrapper;
	}

	private static String sql(LambdaQueryWrapper<Answer> wrapper) {
		return wrapper.getSqlSegment();
	}

	private Map<String, Object> params() {
		assertTrue(lastWrapper instanceof AbstractWrapper, "应该是 MyBatis-Plus 的 Wrapper");
		return ((AbstractWrapper<?, ?, ?>) lastWrapper).getParamNameValuePairs();
	}

}