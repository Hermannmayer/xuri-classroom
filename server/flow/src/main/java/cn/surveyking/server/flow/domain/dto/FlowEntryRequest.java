package cn.surveyking.server.flow.domain.dto;

import lombok.Data;

import java.util.List;





@Data
public class FlowEntryRequest {


	private String bpmnXml;

	private String projectId;

	private List<FlowEntryNodeRequest> nodes;

}
