package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** 总面板：匿名答卷总量 + 按班级拆分。 */
@Data
public class ProjectClassAnonymousStatsView {

	private long total;

	private long identified;

	private long anonymous;

	/** 匿名但未带班级（普通公开链接） */
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
