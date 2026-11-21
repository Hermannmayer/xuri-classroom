package cn.surveyking.server.impl;

import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.SysInfoMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.domain.mapper.AnswerViewMapper;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.storage.StorageProperties;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.AbstractWrapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.core.toolkit.LambdaUtils;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;











class AnswerPdfJobServiceImplScopeTest {

	private final AnswerPdfJobServiceImpl service = new AnswerPdfJobServiceImpl(mock(AnswerMapper.class),
			mock(AnswerViewMapper.class), mock(ProjectMapper.class), mock(DeptMapper.class), mock(UserMapper.class),
			mock(SysInfoMapper.class), mock(FileService.class), mock(StorageProperties.class),
			mock(AnswerAccessGuard.class));

	/** 单测不启动 MyBatis，Lambda 缓存是空的：Answer::getClassId 解析不出列名 */
	@BeforeAll
	static void initTableInfo() {
		TableInfo tableInfo = TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""),
				Answer.class);
		LambdaUtils.installCache(tableInfo);
	}

	@Test
	@DisplayName("不选班级：wrapper 里不许出现 class_id（以前 eq(class_id, null) 恒假，整卷导出永远失败）")
	void noClassConditionWithoutClassId() throws Exception {
		LambdaQueryWrapper<Answer> wrapper = baseWrapper(spec -> spec.projectId("p1"));

		String sql = wrapper.getSqlSegment().toLowerCase(Locale.ROOT);
		assertFalse(sql.contains("class_id"), sql);
	}

	@Test
	@DisplayName("选了班级：仍然按 class_id 过滤（历史答卷跟班走）")
	void classConditionKeptWhenClassIdGiven() throws Exception {
		LambdaQueryWrapper<Answer> wrapper = baseWrapper(spec -> spec.projectId("p1").classId("c1"));

		assertTrue(wrapper.getSqlSegment().toLowerCase(Locale.ROOT).contains("class_id = "),
				wrapper.getSqlSegment());
		assertTrue(params(wrapper).containsValue("c1"), params(wrapper).toString());
	}

	@Test
	@DisplayName("ids 为空 = 整卷（不限），有 id 才加 in")
	void idsFilterOnlyWhenPresent() throws Exception {
		String without = baseWrapper(spec -> spec.projectId("p1")).getSqlSegment().toLowerCase(Locale.ROOT);
		assertFalse(without.contains("id in "), without);

		String with = baseWrapper(spec -> spec.projectId("p1").ids(List.of("a1"))).getSqlSegment()
				.toLowerCase(Locale.ROOT);
		assertTrue(with.contains("id in "), with);


		String empty = baseWrapper(spec -> spec.projectId("p1").ids(List.of())).getSqlSegment().toLowerCase(Locale.ROOT);
		assertFalse(empty.contains("id in "), empty);
	}

	@Test
	@DisplayName("时间范围：create_at 严格大于开始、小于结束；不传就不加")
	void timeRangeOnlyWhenSet() throws Exception {
		String without = baseWrapper(spec -> spec.projectId("p1")).getSqlSegment().toLowerCase(Locale.ROOT);
		assertFalse(without.contains("create_at >"), without);
		assertFalse(without.contains("create_at <"), without);

		String with = baseWrapper(spec -> spec.projectId("p1").startTime(new Date(1_700_000_000_000L))
				.endTime(new Date(1_700_100_000_000L))).getSqlSegment().toLowerCase(Locale.ROOT);
		assertTrue(with.contains("create_at > "), with);
		assertTrue(with.contains("create_at < "), with);
	}

	@Test
	@DisplayName("只导已交卷：暂存草稿（temp_save=0）永远被排除")
	void draftAnswersExcluded() throws Exception {
		String sql = baseWrapper(spec -> spec.projectId("p1")).getSqlSegment().toLowerCase(Locale.ROOT);
		assertTrue(sql.contains("temp_save = "), sql);
	}



	/** baseWrapper 是私有的（对外只暴露 createJob，任务建完就丢进线程池，没法从外面观察范围） */
	private LambdaQueryWrapper<Answer> baseWrapper(Consumer<AnswerPdfJobServiceImpl.ExportSpec> customizer)
			throws Exception {
		AnswerPdfJobServiceImpl.ExportSpec spec = new AnswerPdfJobServiceImpl.ExportSpec();
		customizer.accept(spec);
		Method method = AnswerPdfJobServiceImpl.class.getDeclaredMethod("baseWrapper",
				AnswerPdfJobServiceImpl.ExportSpec.class);
		method.setAccessible(true);
		@SuppressWarnings("unchecked")
		LambdaQueryWrapper<Answer> wrapper = (LambdaQueryWrapper<Answer>) method.invoke(service, spec);
		return wrapper;
	}

	private static Map<String, Object> params(LambdaQueryWrapper<Answer> wrapper) {
		return ((AbstractWrapper<?, ?, ?>) wrapper).getParamNameValuePairs();
	}

}