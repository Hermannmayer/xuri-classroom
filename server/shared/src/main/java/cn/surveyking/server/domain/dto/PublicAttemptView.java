package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 单次作答的成绩摘要：用于「再考一次」后的历次成绩列表。
 *
 * @author javahuang
 */
@Data
public class PublicAttemptView {

	private String answerId;

	private Double examScore;

	/**
	 * 提交时间（epoch 毫秒），前端按本地时区格式化，避免后端时区/格式差异
	 */
	private Long createAt;

}
