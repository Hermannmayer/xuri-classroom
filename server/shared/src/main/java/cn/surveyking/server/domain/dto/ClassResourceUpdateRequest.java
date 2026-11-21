package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;




@Data
public class ClassResourceUpdateRequest {

	private String id;


	private Long startAt;


	private Long endAt;


	private Integer status;


	private ClassResourceSetting settings;

}
