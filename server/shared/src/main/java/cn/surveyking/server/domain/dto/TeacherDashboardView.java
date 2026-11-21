package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;















@Data
public class TeacherDashboardView {


	private long classes;


	private long students;


	private long published;


	private long projects;


	private long answers;


	private long pendingGrading;


	private long graded7d;


	private Double avgScore;


	private List<Recent> recent = new ArrayList<>();








	@Data
	public static class Recent {

		private String projectId;

		private String projectName;


		private Integer status;

		private long answerCount;


		private Double avgScore;

		private long pendingGrading;


		private Date lastAnswerAt;

	}

}
