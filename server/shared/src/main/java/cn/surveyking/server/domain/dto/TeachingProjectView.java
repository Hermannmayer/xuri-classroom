package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 教学工作台：一场考试（或问卷）的答卷概况。
 */
@Data
public class TeachingProjectView {

	private String projectId;

	private String projectName;

	private Integer status;

	/** 已交卷份数 */
	private Long answerCount;

	/** 平均分（可能为空） */
	private Double avgScore;

}
