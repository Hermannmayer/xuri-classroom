package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;









@Data
public class AiPaperCheckView {


	private Integer score;


	private String summary;


	private String advice;

	private List<Issue> issues = new ArrayList<>();

	@Data
	public static class Issue {


		private String kind;


		private String severity;


		private List<String> questionIds = new ArrayList<>();


		private String message;


		private String suggestion;

	}

}
