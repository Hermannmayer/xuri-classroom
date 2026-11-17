package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 题库体检请求（{@code POST /api/ai/repo/audit}）。
 *
 * <p>一次最多体检 {@link #limit} 道题（默认 40，上限 120）：每道题都要模型看一遍，
 * 题目越多越慢也越贵，先把「最需要修的一批」处理掉更实际。
 *
 * @author ai-actions
 */
@Data
public class AiRepoAuditRequest {

	/** 题库 id（必填） */
	private String repoId;

	/** 只体检某个章节（可空） */
	private String chapter;

	/** 只体检这些题目（可空；为空时按「缺解析 / 缺难度 / 缺章节」优先挑） */
	private java.util.List<String> templateIds;

	/** 本次最多体检多少题（默认 40，上限 120） */
	private Integer limit;

	/** 是否做重复题识别（默认 true） */
	private Boolean includeDuplicates;

	/** 是否生成补解析建议（默认 true） */
	private Boolean includeAnalysis;

}
