package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class PositionRequest {

	private String id;

	private String name;

	private String code;


	private Boolean isVirtual = false;


	private String dataPermissionType;

}
