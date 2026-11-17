package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 老师视角的首页（GET /api/dashboard/teacher）。
 *
 * <p>所有数字都按<b>当前登录老师的可见范围</b>裁剪，和管理员看到的系统级总览是两套口径：
 * <ul>
 * <li>班级：{@code ClassService} 那套可见性（班主任＝自己创建/负责的班，被授权老师＝
 * t_class_partner 里授过的班，管理员 / class:grant＝全部），见 {@code ClassServiceImpl#listClassTree}；</li>
 * <li>项目：自己创建 + 自己是所有者/协作者（t_project_partner，含按用户组授权）+ 自己可见班级上
 * 分配过的资源，与 {@code AnswerAccessGuard} 的可读口径一致。</li>
 * </ul>
 * 其余字段都基于这两批班级/项目统计出来，所以「项目 3 个」不会出现第 4 个项目的数据。
 *
 * @author be-stats
 */
@Data
public class TeacherDashboardView {

	/** 可见班级数 */
	private long classes;

	/** 可见班级里的学员去重数（主班 + 兼报班） */
	private long students;

	/** 可见项目里已发布的数量 */
	private long published;

	/** 可见项目总数（考试 + 问卷，不含文件夹：文件夹不是可作答的项目） */
	private long projects;

	/** 这些项目收到的答卷数（正式交卷，含匿名） */
	private long answers;

	/** 这些答卷里待批改的数量 */
	private long pendingGrading;

	/** 近 7 天批改完的答卷数（graded_at 在窗口内） */
	private long graded7d;

	/** 这些答卷的平均分；没有带分数的答卷时为 null */
	private Double avgScore;

	/** 最近有动静的 8 个项目 */
	private List<Recent> recent = new ArrayList<>();

	/**
	 * 一个项目的作答概况。
	 *
	 * <p>排序按 {@link #lastAnswerAt} 倒序（最近有人交卷的排前面），没答过卷的排在最后、
	 * 再按项目创建时间倒序。{@code answerCount=0} 的项目也会出现：老师刚建好还没发出去的卷子，
	 * 首页上要能看见「这个还没人答」。
	 */
	@Data
	public static class Recent {

		private String projectId;

		private String projectName;

		/** t_project.status：1 已发布 / 0 未发布 */
		private Integer status;

		private long answerCount;

		/** 平均分；该项目还没有带分数的答卷时为 null */
		private Double avgScore;

		private long pendingGrading;

		/** 最近一次交卷时间；没人交过为 null */
		private Date lastAnswerAt;

	}

}
