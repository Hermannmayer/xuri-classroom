package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;


@Data
public class ProjectClassAnonymousStatsView {

	private long total;

	private long identified;

	private long anonymous;


	private long unassignedAnonymous;

	private List<ClassStat> classes = new ArrayList<>();

	@Data
	public static class ClassStat {

		private String classId;

		private String className;

		private long total;

		private long identified;

		private long anonymous;

	}

}
