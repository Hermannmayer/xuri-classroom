package cn.surveyking.server.domain.dto;

import lombok.Data;

/** 投影表聚合结果：一题（或一题一选项）的回答人数 */
@Data
public class AnswerItemStat {

	private String questionId;

	private String optionId;

	private Long cnt;

}