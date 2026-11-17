package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;

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

	private Date startTime;

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
	 * 是否显式包含匿名答卷；默认 false。
	 * <p>只有管理员/项目管理者生效，普通学员即使传 true 也会被强制过滤。
	 */
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
