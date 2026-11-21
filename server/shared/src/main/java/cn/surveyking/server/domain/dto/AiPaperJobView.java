package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;











@Data
public class AiPaperJobView {


	public static final String STATUS_QUEUED = "queued";


	public static final String STATUS_RUNNING = "running";


	public static final String STATUS_DONE = "done";


	public static final String STATUS_FAILED = "failed";

	private String jobId;


	private String status;


	private Integer progress;


	private String error;


	private Result result;

	@Data
	public static class Result {


		private List<SurveySchema> questions;

		private Stats stats;

	}


	@Data
	public static class Stats {

		private Integer questionCount;

		private Double totalScore;


		private LinkedHashMap<String, Integer> typeCount;


		private LinkedHashMap<String, Double> typeScore;

	}

}
