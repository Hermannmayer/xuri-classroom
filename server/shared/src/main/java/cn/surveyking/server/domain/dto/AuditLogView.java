package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;










@Data
public class AuditLogView {

	private String id;


	private String action;


	private String actionName;


	private String targetId;


	private String targetName;

	private String detail;






	private String beforeJson;


	private String afterJson;


	private String source;


	private String requestId;

	private String ip;


	private String createBy;


	private String operatorName;

	private Date createAt;

}
