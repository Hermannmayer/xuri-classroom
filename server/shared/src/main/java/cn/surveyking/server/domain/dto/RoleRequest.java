package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;





@Data
public class RoleRequest {

	private String id;

	private String name;

	private String code;

	private String remark;


	private List<String> authorities;

	private List<String> userIds;

	private List<String> evictUserIds;

	private Integer status;

}
