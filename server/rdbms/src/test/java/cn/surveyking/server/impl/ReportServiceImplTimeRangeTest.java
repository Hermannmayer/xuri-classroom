package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.ReportData;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.toolkit.LambdaUtils;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 报表时间范围的回归：wrapper 上要带 {@code create_at >= / <=}，且过滤对「统计」和「每日答卷量」同时生效。
 *
 * <p>纯 Mockito：Mapper 只回放数据、抓 Wrapper 看 SQL 结构，不启动 Spring、不连库。
 * 「答卷列表」不在 ReportData 里（前端另走 answer 列表接口），所以这里验证的是
 * 报表内部那份 answerList 同时喂给 statistics 与 dailyCountStat。
 */
class ReportServiceImplTimeRangeTest {

	private final AnswerMapper answerMapper = mock(AnswerMapper.class);

	private final ProjectMapper projectMapper = mock(ProjectMapper.class);

	/** 单测没有 MyBatis 启动流程，Lambda 列名缓存要手动登记一次 */
	@BeforeAll
	static void initTableInfo() {
		TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
				Answer.class);
		LambdaUtils.installCache(tableInfo);
	}

	@Test
	@DisplayName("开始+结束时间：SQL 带 >= / <=，统计与每日答卷量都基于过滤后的名单")
	void timeRangeFiltersStatisticsAndDailyCount() {
		Date from = at(2026, 3, 1);
		Date to = at(2026, 3, 31);
		when(answerMapper.selectList(any())).thenReturn(List.of(answer(at(2026, 3, 2), "A"),
				answer(at(2026, 3, 20), "B")));
		when(projectMapper.selectById("p1")).thenReturn(project());

		ReportData data = new ReportServiceImpl(answerMapper, projectMapper).getData("p1", true, null, from, to);

		assertEquals(2, data.getTotal());
		// 统计：同一个问题被两条答卷各计一次
		assertEquals(2, data.getStatistics().get("q1").getTotal());
		// 每日答卷量：只统计过滤后的两天
		assertEquals(List.of("2026-03-02", "2026-03-20"),
				new ArrayList<>(data.getDailyCountStat().keySet()));
		String sql = capturedSql();
		assertTrue(sql.contains("CREATE_AT >="), sql);
		assertTrue(sql.contains("CREATE_AT <="), sql);
		// 时间范围不改变班级口径：没传 classId 就不该出现班级条件
		assertFalse(sql.contains("CLASS_ID"), sql);
	}

	@Test
	@DisplayName("只传开始时间：只有下界，不误加一个空的 <= ")
	void onlyStartTimeAddsLowerBoundOnly() {
		when(answerMapper.selectList(any())).thenReturn(List.of());

		ReportData data = new ReportServiceImpl(answerMapper, projectMapper).getData("p1", true, null,
				at(2026, 3, 1), null);

		assertEquals(0, data.getTotal());
		String sql = capturedSql();
		assertTrue(sql.contains("CREATE_AT >="), sql);
		assertFalse(sql.contains("CREATE_AT <="), sql);
	}

	@Test
	@DisplayName("旧签名（不带时间）：行为不变，不出现 create_at 条件")
	void defaultOverloadKeepsNoTimeFilter() {
		when(answerMapper.selectList(any())).thenReturn(List.of());

		ReportData data = new ReportServiceImpl(answerMapper, projectMapper).getData("p1", false, "class-1");

		assertEquals(0, data.getTotal());
		String sql = capturedSql();
		// 只看 WHERE 里的比较条件：ORDER BY CREATE_AT 一直都在，不能拿 "CREATE_AT" 当时间过滤的标志
		assertFalse(sql.contains("CREATE_AT >="), sql);
		assertFalse(sql.contains("CREATE_AT <="), sql);
		assertTrue(sql.contains("CLASS_ID ="), sql);
	}

	// ------ helpers

	@SuppressWarnings({ "unchecked", "rawtypes" })
	private String capturedSql() {
		ArgumentCaptor<Wrapper<Answer>> captor = ArgumentCaptor.forClass((Class) Wrapper.class);
		verify(answerMapper, atLeastOnce()).selectList(captor.capture());
		return captor.getValue().getCustomSqlSegment().toUpperCase(Locale.ROOT);
	}

	private static Date at(int year, int month, int day) {
		return Date.from(LocalDate.of(year, month, day).atStartOfDay(ZoneId.systemDefault()).toInstant());
	}

	/** 一条正式答卷：只放一个单选答案，够统计走通 parseAnswer */
	private static Answer answer(Date createAt, String option) {
		Answer answer = new Answer();
		answer.setProjectId("p1");
		answer.setCreateAt(createAt);
		LinkedHashMap<String, Object> content = new LinkedHashMap<>();
		content.put("q1", option);
		answer.setAnswer(content);
		return answer;
	}

	private static Project project() {
		SurveySchema question = SurveySchema.builder().id("q1").type(SurveySchema.QuestionType.Radio)
				.title("单选题").build();
		SurveySchema root = SurveySchema.builder().id("root").type(SurveySchema.QuestionType.Survey)
				.children(List.of(question)).build();
		Project project = new Project();
		project.setId("p1");
		project.setSurvey(root);
		return project;
	}

}
