package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;


@Data
public class ComposeCreateResult {

	private List<String> projectIds = new ArrayList<>();

	private ComposePlan plan;

}
