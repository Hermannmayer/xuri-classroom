package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;

/**
 * @author javahuang
 * @date 2022/09/08
 */
@Data
public class UserBookRequest {

	private String id;

	/**
	 * 模板ID
	 */
	private String templateId;

	/**
	 * 问题名称
	 */
	private String name;

	/**
	 * 错误次数
	 */
	private Integer wrongTimes;

	/**
	 * 笔记
	 */
	private String note;

	/**
	 * 1标记为简单
	 */
	private Integer status;

	/**
	 * 1我的错题 2我的收藏
	 */
	private Integer type;

	private List<String> ids;

	private Boolean isMarked;

	private LinkedHashMap answer;

	private String answerId;

	/** 来源考试（收藏时用于校验该场考试是否允许收藏） */
	private String projectId;

	/** 题库练习的来源题库 */
	private String repoId;

}
