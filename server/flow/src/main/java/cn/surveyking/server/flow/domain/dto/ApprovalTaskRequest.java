package cn.surveyking.server.flow.domain.dto;

import cn.surveyking.server.domain.dto.AnswerRequest;
import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;





@Data
public class ApprovalTaskRequest {


	private LinkedHashMap answer;

	private String comment;

	private List<AnswerRequest> attachment;

	private String projectId;


	private String answerId;


	private String assignee;

	private String activityId;


	private String newActivityId;

	private String id;


	private String taskId;

	private String processInstanceId;

	private String type;

}
