package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 教学工作台：某场考试按班级（用户组）聚合的答卷情况。
 */
@Data
public class TeachingClassView {

	private String deptId;

	private String deptName;

	/** 该班已交卷份数 */
	private Long answerCount;

	/** 该班平均分 */
	private Double avgScore;

}
