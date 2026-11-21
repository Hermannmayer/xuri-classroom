package cn.surveyking.server.flow.domain.dto;

import lombok.Data;

import java.util.List;





@Data
public class FlowEntryView {

	private String id;

	private String projectId;

	private String bpmnXml;

	private String icon;

	private List<FlowEntryNodeView> nodes;

}
