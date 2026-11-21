package cn.surveyking.server.core.importer;

import cn.surveyking.server.domain.dto.SurveySchema;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;







@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportPreview implements Serializable {


	private String title;


	private String description;


	private SurveySchema tree;


	@Builder.Default
	private List<SurveySchema> flat = new ArrayList<>();

	private Stats stats;

	@Builder.Default
	private List<Warning> warnings = new ArrayList<>();




	@JsonIgnore
	@Builder.Default
	private Map<String, byte[]> attachments = new LinkedHashMap<>();

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


		private String level;

		private String code;

		private String message;

	}

}
