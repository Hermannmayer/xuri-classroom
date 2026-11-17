package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 学员视角的首页（GET /api/dashboard/student）。
 *
 * <p>只用当前登录学员自己的数据，不做任何跨人统计；老师/管理员调用时同样按「他自己作为答题人」
 * 的数据返回（通常全是 0），接口不会因此 500。
 *
 * <p>口径：
 * <ul>
 * <li>{@link #answers} / {@link #avgScore} / {@link #bestScore} 只算<b>正式考试/问卷</b>的答卷，
 * 不算练习：练习写在 t_answer 里但 project_id 是伪项目 'exercise'，混进来会变成「考了 30 场」；</li>
 * <li>练习相关的两个数单独给（{@link #practiceCount} / {@link #practiceQuestions}）；</li>
 * <li>{@link #todoExams}：分配给自己所在班级、已发布、当前在开放时间内、自己还没交过的考试数。</li>
 * </ul>
 *
 * @author be-stats
 */
@Data
public class StudentDashboardView {

	/** 正式答卷数（不含练习） */
	private long answers;

	/** 正式答卷的平均分；没有带分数的答卷时为 null */
	private Double avgScore;

	/** 正式答卷的最高分；没有带分数的答卷时为 null */
	private Double bestScore;

	/** 练习记录条数（与「我的练习记录」列表同一口径：动过笔的记录才算，只点开没答的不算） */
	private long practiceCount;

	/** 练习过的题目数（去重题数，来自 t_answer_item 投影） */
	private long practiceQuestions;

	/** 自己所在的班级数：1 个主班 + 若干兼报班 */
	private long classes;

	/** 待参加的考试数 */
	private long todoExams;

	/** 最近 8 次正式答卷 */
	private List<Recent> recent = new ArrayList<>();

	/** 一次正式答卷的摘要 */
	@Data
	public static class Recent {

		private String projectId;

		private String projectName;

		/** 该次答卷的分数；问卷 / 未判分时为 null */
		private Double examScore;

		private Date createAt;

	}

}
