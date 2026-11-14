package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/** 组卷落库结果：直接创建 N 个考试项目 */
@Data
public class ComposeCreateResult {

	private List<String> projectIds = new ArrayList<>();

	private ComposePlan plan;

}
