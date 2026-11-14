package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** 编辑器「从题库添加」：筛选 + 抽题 */
@Data
public class ComposePickRequest {

	private List<String> repoIds = new ArrayList<>();

	private List<SurveySchema.QuestionType> types = new ArrayList<>();

	private List<String> chapters = new ArrayList<>();

	private List<String> difficulties = new ArrayList<>();

	private List<String> tags = new ArrayList<>();

	private String keyword;

	/** 按题型配题数：key = 题型名 */
	private java.util.Map<String, Integer> counts = new java.util.LinkedHashMap<>();

	/** 按题型配每题分值 */
	private java.util.Map<String, Double> scores = new java.util.LinkedHashMap<>();

	/** random | sequential */
	private String mode = "random";

	private Integer count = 10;

	private Long seed;

	private List<String> excludeIds = new ArrayList<>();

}
