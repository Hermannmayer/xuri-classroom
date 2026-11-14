package cn.surveyking.server.core.importer;

import cn.surveyking.server.domain.dto.SurveySchema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 导入解析结果：前端拿它做预览、统计与落库。
 *
 * <p>
 * 解析阶段不写库，只产出这份结构；落库由调用方（新建试卷 / 追加到题组 / 题库）决定。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportPreview implements Serializable {

	/** 从文件/文本里识别出的试卷标题，可能为空 */
	private String title;

	/** 解析出的试卷标题描述（欢迎语），可能为空 */
	private String description;

	/** 树形结构：Survey → QuestionSet* → 题目；纯文本导入时没有 QuestionSet */
	private SurveySchema tree;

	/** 扁平题目列表，便于按题勾选 */
	@Builder.Default
	private List<SurveySchema> flat = new ArrayList<>();

	private Stats stats;

	@Builder.Default
	private List<Warning> warnings = new ArrayList<>();

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class Stats implements Serializable {

		private int total;

		private double score;

		private int groups;

		@Builder.Default
		private Map<String, Integer> byType = new LinkedHashMap<>();

	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	public static class Warning implements Serializable {

		/** info / warn / error */
		private String level;

		private String code;

		private String message;

	}

}
