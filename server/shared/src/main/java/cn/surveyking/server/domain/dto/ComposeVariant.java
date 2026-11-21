package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


@Data
public class ComposeVariant {

	private int seq;

	private SurveySchema survey;

	private int total;

	private double score;

	private Map<String, Integer> byType = new LinkedHashMap<>();

	private Map<String, Integer> byDifficulty = new LinkedHashMap<>();


	private int repeated;

	private List<String> templateIds;

	private String projectId;

}
