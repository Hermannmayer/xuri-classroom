package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 主观题批改抽屉的整卷视图。
 *
 * <p>分数三件套（objectiveScore / manualScore / examScore）都来自同一个
 * {@code AnswerScoreEvaluator}，与落库的 exam_score 口径完全一致，避免前端算一套、后端存一套。
 *
 * @author grading
 */
@Data
public class AnswerGradeView {

	private String answerId;

	private String projectId;

	private String projectName;

	/** 答题人姓名（交卷时快照）；匿名且没填时为空 */
	private String answererName;

	/** 是否匿名答卷 */
	private Boolean anonymous;

	/** 批改状态：none / pending / graded */
	private String gradeStatus;

	/** 最近一次批改人 id */
	private String gradedBy;

	/** 最近一次批改人姓名（查不到时为空） */
	private String gradedByName;

	/** 最近一次批改时间 */
	private Date gradedAt;

	/** 交卷时间 */
	private Date createAt;

	/** 同项目 + 同答题人的第几次作答（从 0 开始） */
	private Integer attemptNo;

	/** 当前总分（客观题机器分 + 主观题人工分） */
	private Double examScore;

	/** 客观题机器分小计 */
	private Double objectiveScore;

	/** 主观题人工分小计 */
	private Double manualScore;

	/** 卷面满分（所有题目 examScore 之和；没配置分值时为 0） */
	private Double totalScore;

	/** 还有几道主观题没给分 */
	private Integer pendingCount;

	/**
	 * 答卷用的题目树。默认已剥掉 examCorrectAnswer（防止顺手泄题），
	 * 请求带 includeCorrectAnswer=true 时返回原样。
	 */
	private SurveySchema schema;

	/** 逐题视图，顺序与题号一致 */
	private List<AnswerGradeItemView> items = new ArrayList<>();

}
