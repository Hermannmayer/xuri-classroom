package cn.surveyking.server.flow.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;





@Data
public class FlowEntryNodeRequest {

	private String id;




	private String name;




	private String projectId;




	private Integer taskType;




	private LinkedHashMap<String, Integer> fieldPermission;




	private FlowNodeSetting setting;




	private String[] identity;




	private String expression;

}
