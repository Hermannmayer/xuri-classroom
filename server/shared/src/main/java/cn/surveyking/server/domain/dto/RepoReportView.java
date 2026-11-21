package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;







@Data
public class RepoReportView {

	private String repoId;

	private String repoName;


	private int total;


	private Map<String, Integer> byType = new LinkedHashMap<>();


	private Map<String, Integer> byDifficulty = new LinkedHashMap<>();

	private Practice practice = new Practice();


	private List<WeakQuestion> weakQuestions = List.of();


	@Data
	public static class Practice {


		private int count;


		private int students;


		private Double avgScore;

	}


	@Data
	public static class WeakQuestion {

		private String questionId;

		private String title;


		private int answered;


		private int correct;


		private Double rate;

	}

}
