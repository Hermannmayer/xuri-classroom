package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 题库批量修改：标签（追加/覆盖）、难度、分值。
 */
@Data
public class TemplateBatchRequest {

	private List<String> ids;

	/**
	 * 标签
	 */
	private String[] tag;

	/**
	 * true=追加到原标签；false=覆盖；默认追加
	 */
	private Boolean appendTag = Boolean.TRUE;

	/**
	 * 难度（易/中/难），空表示不改
	 */
	private String difficulty;

	/**
	 * 每题分值，null 表示不改
	 */
	private Double score;

}
