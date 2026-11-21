package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;









@Data
public class UnsubmittedStudentView {


	private Integer total;


	private Integer submitted;


	private List<Student> list;


	@Data
	public static class Student {

		private String id;

		private String name;

		private String phone;

	}

}
