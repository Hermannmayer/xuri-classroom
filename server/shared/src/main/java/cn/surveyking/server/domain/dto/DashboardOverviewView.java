package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 首页总览（GET /api/dashboard/overview）。
 *
 * <p>一次请求把所有「块」都带回来，前端首页只需要一个接口，不用并发拼 5 个列表接口再各自算数字。
 *
 * <p>字段全是 <b>系统级</b>口径（不按当前用户裁剪）：看得见的是管理员，普通老师的裁剪口径在
 * {@link TeacherDashboardView}，学员自己的口径在 {@link StudentDashboardView}。
 *
 * <p>计数都用 long 而不是 Long：0 就是 0，不会出现 null 让前端每次都要兜底；
 * 平均值类用 Double，因为「没有可统计的样本」和「平均分 0」是两件事（见各内部类的注释）。
 *
 * @author be-stats
 */
@Data
public class DashboardOverviewView {

	/** 人：学员 / 老师 / 管理员 / 合计 / 近 7 天交过卷的人数 */
	private Users users = new Users();

	/** 班：班级数 / 开班中 / 在册学员 / 平均班额 */
	private Classes classes = new Classes();

	/** 卷：项目总数 / 考试 / 问卷 / 文件夹 / 已发布 / 进行中 */
	private Projects projects = new Projects();

	/** 答卷：总数 / 今天 / 近 7 天 / 近 30 天 / 已批改 / 待批改 */
	private Answers answers = new Answers();

	/** 题库：题库数与题目模板数 */
	private Questions questions = new Questions();

	/** 分数：平均分 / 及格率 / 最高 / 最低 / 有分数的答卷数 */
	private Scores scores = new Scores();

	/** AI：近 7 天调用次数与 token 消耗 */
	private Ai ai = new Ai();

	/**
	 * 用户口径：三类互斥，student + teacher + admin = total，同一个人不会被数两次。
	 *
	 * <p>判定顺序是「先认管理员」：管理员角色优先于 user_type，
	 * 所以一个有 student 账号但挂着 admin 角色的人算管理员，不算学员。
	 */
	@Data
	public static class Users {

		/** 学员：t_user.user_type='student' 且不是管理员 */
		private long student;

		/** 老师：t_user.user_type='staff' 且不是管理员（管理员也是 staff，先扣掉） */
		private long teacher;

		/** 管理员：直挂 admin 角色，或登录账号是 admin */
		private long admin;

		/** 合计 = student + teacher + admin */
		private long total;

		/** 近 7 天交过卷的去重人数（t_answer.create_by distinct，含登录学员与教职工） */
		private long active7d;

	}

	/**
	 * 班级口径。
	 *
	 * <p>t_dept 上<b>没有</b>「开班中」状态字段：班级只有 dept_type=class、class_kind=teaching/group
	 * 这两个维度，开班与结班是业务动作而不是字段。所以这里的「开班中」用两个可观测条件近似：
	 * 教学班 + 有在册学员 + 至少分配了一个「已发布」的考试/问卷（见 DashboardStatsServiceImpl）。
	 */
	@Data
	public static class Classes {

		/** 班级节点总数（dept_type='class'，含容器班） */
		private long total;

		/** 开班中：教学班（class_kind≠group）且有在册学员、且有已发布项目的班级资源 */
		private long open;

		/** 在册学员：主班挂在班级节点上的学员去重数（兼报班不重复计人） */
		private long students;

		/** 平均班额 = students / total，保留 1 位小数；没有班级时为 0 */
		private double avgSize;

	}

	/**
	 * 项目（考试 / 问卷 / 文件夹）口径。
	 *
	 * <p>「进行中」只对考试有意义：已发布 + 当前落在开放时间内。
	 * 开放时间来自 {@code t_project.setting} 里的 {@code examSetting.startTime/endTime}
	 * （epoch 毫秒），不是独立的时间列 —— t_project 没有 start_time/end_time 字段。
	 */
	@Data
	public static class Projects {

		/** 全部未删除项目（含文件夹） */
		private long total;

		private long exam;

		private long survey;

		private long folder;

		/** status=1 */
		private long published;

		/** 已发布 + 当前在开放时间内（两端为空表示不限） */
		private long running;

	}

	/**
	 * 答卷口径：全部按「正式交卷」= {@code temp_save=1}，并<b>排除练习记录</b>
	 * （练习写在 t_answer 里但 project_id 是伪项目 'exercise'，算进来会把「累计答卷」刷成练习次数）。
	 *
	 * <p>包含匿名答卷：首页看的是「一共收上来多少」。
	 */
	@Data
	public static class Answers {

		private long total;

		/** 今天 0 点之后 */
		private long today;

		/** 近 7 天（滚动 7×24 小时，含此刻往前推） */
		private long last7d;

		/** 近 30 天（滚动 30×24 小时） */
		private long last30d;

		/** grade_status='graded'：主观题都批完了 */
		private long graded;

		/** grade_status='pending'：还有主观题等老师批 */
		private long pending;

	}

	/** 题库：t_repo 与 t_template 的逻辑未删除行数 */
	@Data
	public static class Questions {

		private long repos;

		private long templates;

	}

	/**
	 * 分数口径：只看<b>有分数的正式答卷</b>（temp_save=1 且 exam_score 非空）。
	 *
	 * <p>avg/max/min 在没有样本时为 null —— 和「平均 0 分」区分开；
	 * passRate 同理。passRate 是百分数（0~100，保留 1 位小数）。
	 *
	 * <p>及格线是<b>绝对 60 分</b>，不是「满分的 60%」：系统级面板要跨所有卷子统计，
	 * 逐卷还原满分必须把每份 survey schema 都读出来算一遍，代价远超首页预算。
	 * 单卷的及格率请看考试报表 / MCP 的 view=exam（那里按满分 × 60% 算）。
	 */
	@Data
	public static class Scores {

		private Double avg;

		/** 及格率（%），没有样本时为 null */
		private Double passRate;

		private Double max;

		private Double min;

		/** 有分数的答卷数（avg/max/min/passRate 的分母） */
		private long scoredCount;

	}

	/** AI 用量：t_ai_usage 近 7 天（滚动），含失败与被拦下的调用 —— token 一样花了 */
	@Data
	public static class Ai {

		private long calls7d;

		private long tokens7d;

	}

}
