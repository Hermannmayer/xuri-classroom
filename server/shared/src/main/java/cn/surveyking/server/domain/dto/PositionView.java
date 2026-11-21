package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class PositionView {

	private String id;

	private String name;

	private String code;


	private Boolean isVirtual = false;


	private String dataPermissionType;

}
