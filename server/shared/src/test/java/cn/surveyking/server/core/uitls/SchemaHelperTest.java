package cn.surveyking.server.core.uitls;

import cn.surveyking.server.domain.dto.SurveySchema;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * 扁平化是所有统计/导出/答题页共用的基础操作，拆类时它必须保持不变。
 */
class SchemaHelperTest {

	private static SurveySchema option(String id) {
		return SurveySchema.builder().id(id).type(SurveySchema.QuestionType.Option).title(id).build();
	}

	private static SurveySchema question(String id, String title, String... optionIds) {
		List<SurveySchema> options = new ArrayList<SurveySchema>();
		for (String optionId : optionIds) {
			options.add(option(optionId));
		}
		return SurveySchema.builder().id(id).type(SurveySchema.QuestionType.Radio).title(title).children(options).build();
	}

	@Test
	@DisplayName("默认扁平化只返回有数据的题目，不含选项")
	void flatExcludesOptions() {
		SurveySchema schema = SurveySchema.builder().id("p").type(SurveySchema.QuestionType.Survey).title("卷")
				.children(java.util.Arrays.asList(question("q1", "题1", "q1o1", "q1o2"),
						question("q2", "题2", "q2o1")))
				.build();
		assertEquals(2, SchemaHelper.flatSurveySchema(schema).size());
	}

	@Test
	@DisplayName("withOption=true 时把选项也展开")
	void flatWithOptions() {
		SurveySchema schema = SurveySchema.builder().id("p").type(SurveySchema.QuestionType.Survey).title("卷")
				.children(java.util.Arrays.asList(question("q1", "题1", "q1o1", "q1o2"),
						question("q2", "题2", "q2o1")))
				.build();
		assertEquals(5, SchemaHelper.flatSurveySchemaWitchOption(schema, true).size());
	}

	@Test
	@DisplayName("说明/分割线等无数据节点不参与扁平化")
	void nonDataNodesIgnored() {
		SurveySchema schema = SurveySchema.builder().id("p").type(SurveySchema.QuestionType.Survey).title("卷")
				.children(java.util.Arrays.asList(
						SurveySchema.builder().id("r1").type(SurveySchema.QuestionType.Remark).title("说明").build(),
						SurveySchema.builder().id("s1").type(SurveySchema.QuestionType.SplitLine).title("").build(),
						question("q1", "题1", "q1o1")))
				.build();
		assertEquals(1, SchemaHelper.flatSurveySchema(schema).size());
	}

}
