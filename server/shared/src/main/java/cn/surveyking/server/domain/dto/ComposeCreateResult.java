package cn.surveyking.server.domain.dto;

import lombok.Data;

/** 组卷落库结果 */
@Data
public class ComposeCreateResult {

	private String batchId;

	private ComposePlan plan;

}
