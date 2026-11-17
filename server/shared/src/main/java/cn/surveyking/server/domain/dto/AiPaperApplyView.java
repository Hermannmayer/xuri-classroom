package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 追加 AI 题目的结果：加了几个、加完一共几个题。
 *
 * @author p4-backend
 */
@Data
public class AiPaperApplyView {

	private String projectId;

	/** 本次追加的题数 */
	private Integer added;

	/** 追加后卷内题目总数 */
	private Integer total;

}
