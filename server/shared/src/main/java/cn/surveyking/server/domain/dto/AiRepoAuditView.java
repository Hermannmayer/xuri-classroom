package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;









@Data
public class AiRepoAuditView {


	private String summary;


	private List<AiPaperCheckView.Issue> issues = new ArrayList<>();


	private List<Duplicate> duplicates = new ArrayList<>();


	private List<Patch> patches = new ArrayList<>();


	private Integer checked;

	@Data
	public static class Duplicate {


		private List<String> ids = new ArrayList<>();


		private List<String> titles = new ArrayList<>();


		private Double similarity;


		private String reason;


		private String suggestion;

	}

	@Data
	public static class Patch {

		private String id;


		private String title;


		private String difficulty;


		private String chapter;


		private List<String> tags;


		private String analysis;


		private String reason;

	}

}
