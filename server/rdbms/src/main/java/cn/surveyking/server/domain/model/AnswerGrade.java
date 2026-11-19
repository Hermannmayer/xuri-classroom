package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * 主观题人工批改明细：一行 = 一份答卷的一道题。
 *
 * <p>单独开表而不是塞进 {@code t_answer.exam_info} 的 JSON：两位老师并发批同一份卷时，
 * 按题 upsert 不会互相覆盖；唯一键 {@code (answer_id, question_id)} 兜住重复提交。
 *
 * <p>真源仍是答案本身：学生重新提交后这些行会被整体清空（见 AnswerGradeServiceImpl#onSubmitted）。
 *
 * @author grading
 */
@Data
@TableName("t_answer_grade")
public class AnswerGrade {

	@TableId(type = IdType.ASSIGN_UUID)
	private String id;

	/** t_answer.id */
	private String answerId;

	/** 冗余项目 id，便于按项目统计批改进度 */
	private String projectId;

	/** 题目 id（只允许 examAnswerMode=manual 的题） */
	private String questionId;

	/** 人工给定分数 */
	private Double score;

	/** 批改评语 */
	private String comment;

	/** 批改人（t_user.id） */
	private String grader;

	/** 首次批改时间 */
	private Date createAt;

	/** 最近一次改分时间 */
	private Date updateAt;

	/**
	 * 分数来源：{@code manual} 人工给分 / {@code ai} AI 预批改。
	 * <p>AI 批量批改走的是同一条写库路径，所以必须单独记来源，否则老师复核时分不清这块分是谁给的，
	 * 也没法筛出「AI 批过、等人看」的卷子。老师覆盖 AI 分后来源会变回 manual。
	 */
	private String source = "manual";

}
