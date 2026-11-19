package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/8/31
 */
@Data
@EqualsAndHashCode(callSuper = false)
public class AnswerQuery extends PageQuery {

	private String id;

	private String projectId;

	private List<String> ids;

	private String ip;

	private String cookie;

	/**
	 * 交卷时间下界（含）。必须带 `@DateTimeFormat`：前端传的是 `yyyy-MM-dd HH:mm:ss` 字符串，
	 * 没有它 Spring 会按默认格式解析失败，整个列表接口直接 400。
	 */
	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	private Date startTime;

	/** 交卷时间上界（不含；前端取次日 00:00:00 以覆盖整天） */
	@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	private Date endTime;

	private String createBy;

	/** 按班级过滤（t_answer.class_id，答题时所在班级）；为空不过滤 */
	private String classId;

	/**
	 * 按「第几次作答」过滤（t_answer.attempt_no，从 0 开始）。
	 * <p>同一个学生同一场考试可以考多次（补考），导出/批改时需要区分；为空不过滤。
	 */
	private Integer attemptNo;

	/**
	 * 按批改状态过滤：none / pending / graded；为空不过滤。
	 * <p>待批改列表用 pending。
	 */
	private String gradeStatus;

	/**
	 * 按答题人姓名模糊过滤（数据页 / 班级答卷页的搜索框）；为空不过滤。
	 * <p>为什么要命中两处：新答卷在 {@code t_answer.answerer_name} 里存了姓名快照（改账号名不影响历史），
	 * 而老数据没有快照、只能回到 {@code t_user.name} 上找。所以条件写成
	 * 「answerer_name like ? OR create_by in (select id from t_user where name like ?)」，
	 * 只查其中一边都会漏人。
	 */
	private String createByName;

	/**
	 * 分数段下限（含边界）；为空不过滤。
	 * <p>没判分的答卷 {@code exam_score} 为 NULL，SQL 里 NULL 参与大小比较恒为 UNKNOWN，
	 * 不会被 {@code >=} 误命中，不需要额外加 is not null。
	 */
	private Double minScore;

	/**
	 * 分数段上限（含边界）；为空不过滤。
	 * <p>与 {@link #minScore} 一起用是「区间」，单独用是「不高于 X 分」（例如只筛选不及格）。
	 */
	private Double maxScore;

	/**
	 * 是否显式包含匿名答卷；默认 false。
	 * <p>只有管理员/项目管理者生效，普通学员即使传 true 也会被强制过滤。
	 */
	/**
	 * 只看「含 AI 预批改分数」的答卷：t_answer_grade 里还有 source='ai' 的记录。
	 * <p>老师复核并改过分之后，那些题的 source 会变回 manual；全部改完就不再出现在这里。
	 */
	private Boolean aiReview;

	private Boolean includeAnonymous;

	/** 后台统计专用：count 时排除匿名答卷（答题限次/幂等不传，保持原口径） */
	private Boolean excludeAnonymous;

	/** 获取最近一份答案 */
	private Boolean latest;

	private boolean rankEnabled;

	/**
	 * 根据选项答案查询
	 */
	private String valueQuery;

}
