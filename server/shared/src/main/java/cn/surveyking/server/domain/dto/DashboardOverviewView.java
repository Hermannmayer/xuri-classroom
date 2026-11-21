package cn.surveyking.server.domain.dto;

import lombok.Data;














@Data
public class DashboardOverviewView {


	private Users users = new Users();


	private Classes classes = new Classes();


	private Projects projects = new Projects();


	private Answers answers = new Answers();


	private Questions questions = new Questions();


	private Scores scores = new Scores();


	private Ai ai = new Ai();







	@Data
	public static class Users {


		private long student;


		private long teacher;


		private long admin;


		private long total;


		private long active7d;

	}








	@Data
	public static class Classes {


		private long total;


		private long open;


		private long students;


		private double avgSize;

	}








	@Data
	public static class Projects {


		private long total;

		private long exam;

		private long survey;

		private long folder;


		private long published;


		private long running;

	}







	@Data
	public static class Answers {

		private long total;


		private long today;


		private long last7d;


		private long last30d;


		private long graded;


		private long pending;

	}


	@Data
	public static class Questions {

		private long repos;

		private long templates;

	}











	@Data
	public static class Scores {

		private Double avg;


		private Double passRate;

		private Double max;

		private Double min;


		private long scoredCount;

	}


	@Data
	public static class Ai {

		private long calls7d;

		private long tokens7d;

	}

}
