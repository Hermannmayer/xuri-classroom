package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;













@Data
public class AiPaperPickRequest {


	private String projectId;


	private List<String> repoIds;


	private List<String> chapters;


	private List<String> difficulties;


	private LinkedHashMap<String, Double> typeRatio;


	private LinkedHashMap<String, Double> typeScores;


	private Integer questionCount;


	private Double totalScore;


	private String requirements;


	private Boolean aiSelect;


	private Integer maxCandidates;

}
