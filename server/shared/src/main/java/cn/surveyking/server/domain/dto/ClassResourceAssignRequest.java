package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;







@Data
public class ClassResourceAssignRequest {

	private String classId;


	private String resourceType;

	private List<String> resourceIds;


	private Long startAt;


	private Long endAt;


	private Integer status;


	private ClassResourceSetting settings;

}
