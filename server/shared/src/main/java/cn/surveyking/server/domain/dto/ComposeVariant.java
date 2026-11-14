package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 一套卷子 */
@Data
public class ComposeVariant {

	private int seq;

	private SurveySchema survey;

	private int total;

	private double score;

	private Map<String, Integer> byType = new LinkedHashMap<>();

	private Map<String, Integer> byDifficulty = new LinkedHashMap<>();

	/** 与上一套重复的题数 */
	private int repeated;

	private List<String> templateIds;

	private String projectId;

}
