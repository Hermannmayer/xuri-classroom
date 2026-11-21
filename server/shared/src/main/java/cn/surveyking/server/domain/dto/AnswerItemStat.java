package cn.surveyking.server.domain.dto;

import lombok.Data;


@Data
public class AnswerItemStat {

	private String questionId;

	private String optionId;

	private Long cnt;

}