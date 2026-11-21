package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;













@Data
public class AuditAnswerTimelineView {


	private Date at;


	private String operator;


	private String actionName;


	private String questionId;


	private Object before;


	private Object after;

}
