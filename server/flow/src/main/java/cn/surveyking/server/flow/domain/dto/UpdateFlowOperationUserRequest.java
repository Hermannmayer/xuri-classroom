package cn.surveyking.server.flow.domain.dto;

import lombok.Data;





@Data
public class UpdateFlowOperationUserRequest {

	private String instanceId;

	private String userId;

	private Integer taskType;

}
