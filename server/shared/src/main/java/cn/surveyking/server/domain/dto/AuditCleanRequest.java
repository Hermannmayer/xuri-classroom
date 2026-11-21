package cn.surveyking.server.domain.dto;

import lombok.Data;




@Data
public class AuditCleanRequest {

	private Boolean all;

	private Integer beforeDays;

	private String before;

}
