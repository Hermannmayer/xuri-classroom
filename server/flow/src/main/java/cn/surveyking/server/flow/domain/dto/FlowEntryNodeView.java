package cn.surveyking.server.flow.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;





@Data
public class FlowEntryNodeView {

	private String id;

	private String name;

	private String flowId;

	private String projectId;


	private String flowType;


	private LinkedHashMap<String, Integer> fieldPermission;

	private FlowNodeSetting setting;

	private String[] identity;

	private String expression;

}
