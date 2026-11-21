package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

















@Data
public class StudentDashboardView {


	private long answers;


	private Double avgScore;


	private Double bestScore;


	private long practiceCount;


	private long practiceQuestions;


	private long classes;


	private long todoExams;








	private List<Recent> recent = new ArrayList<>();


	@Data
	public static class Recent {

		private String projectId;

		private String projectName;


		private Double examScore;

		private Date createAt;

	}

}
