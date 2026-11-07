package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/**
 * 「我的成绩」一行：某个考试我参加过的汇总。
 */
@Data
public class MyReportView {

	private String projectId;

	private String projectName;

	/** 项目状态：1 已发布 / 0 未发布 */
	private Integer status;

	/** 已交卷次数 */
	private Integer attempts;

	/** 最高分（可能为空：例如还没出分） */
	private Double bestScore;

	/** 最近一次交卷时间 */
	private Date lastSubmitAt;

}
