package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class PermissionView {

	private String name;

	private String code;

	public PermissionView(String code) {
		this.code = code;
	}

}
