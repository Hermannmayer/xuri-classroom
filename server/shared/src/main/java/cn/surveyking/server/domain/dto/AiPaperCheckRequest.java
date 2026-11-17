package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 试卷质检请求（{@code POST /api/ai/paper/check}）：考前一键体检一份已编好的试卷。
 *
 * @author ai-actions
 */
@Data
public class AiPaperCheckRequest {

	/** 要体检的项目（必填） */
	private String projectId;

	/** 是否让模型补一段「整体建议」（默认 true）；false 只跑确定性规则，不花 token */
	private Boolean aiSummary;

}
