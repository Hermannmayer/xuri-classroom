package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;


@Data
public class ComposePickRequest {

	private List<String> repoIds = new ArrayList<>();

	private List<SurveySchema.QuestionType> types = new ArrayList<>();

	private List<String> chapters = new ArrayList<>();

	private List<String> difficulties = new ArrayList<>();

	private List<String> tags = new ArrayList<>();

	private String keyword;


	private java.util.Map<String, Integer> counts = new java.util.LinkedHashMap<>();


	private java.util.Map<String, Double> scores = new java.util.LinkedHashMap<>();


	private String mode = "random";

	private Integer count = 10;

	private Long seed;

	private List<String> excludeIds = new ArrayList<>();

}
