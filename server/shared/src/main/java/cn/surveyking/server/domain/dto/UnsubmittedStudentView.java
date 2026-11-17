package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 未交卷名单：某场考试在某个班里「还有谁没交」。
 *
 * <p>名单按人算，不按答卷行算：同一名学员可能补考多次、也可能走兼报班的专属链接进来答卷，
 * 服务端只关心「这个人有没有正式交过一次」。
 *
 * <p>total / submitted 都是班级全体口径；{@link #list} 只放没交的人（按姓名排序）。
 */
@Data
public class UnsubmittedStudentView {

	/** 班级学员总数（主组 + 兼报组） */
	private Integer total;

	/** 其中已在项目里正式交卷的人数 */
	private Integer submitted;

	/** 还没交卷的学员；班级人数异常多时只返回前 500 条（见实现里的硬上限） */
	private List<Student> list;

	/** 名单行：只给催交需要的三项，不带账号状态等与「交没交」无关的信息 */
	@Data
	public static class Student {

		private String id;

		private String name;

		private String phone;

	}

}
