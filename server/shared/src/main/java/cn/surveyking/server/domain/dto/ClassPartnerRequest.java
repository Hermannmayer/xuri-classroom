package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;








@Data
public class ClassPartnerRequest {

	private String deptId;

	private List<String> userIds;


	private String id;


	private Integer accessLevel;

}
