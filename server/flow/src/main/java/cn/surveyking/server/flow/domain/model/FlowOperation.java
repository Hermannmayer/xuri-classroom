package cn.surveyking.server.flow.domain.model;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;
import java.util.LinkedHashMap;






@TableName(value = "t_flow_operation", autoResultMap = true)
@Data
public class FlowOperation implements Serializable {




	@TableId(value = "id")
	private String id;




	@TableField(value = "instance_id")
	private String instanceId;




	@TableField(value = "project_id")
	private String projectId;




	@TableField(value = "activity_id")
	private String activityId;




	@TableField(value = "new_activity_id")
	private String newActivityId;




	@TableField(value = "task_id")
	private String taskId;




	@TableField(value = "answer_id")
	private String answerId;




	@TableField(value = "task_name")
	private String taskName;




	@TableField(value = "task_type")
	private Integer taskType;




	@TableField(value = "approval_type")
	private String approvalType;




	@TableField(value = "comment")
	private String comment;




	@TableField(value = "delegate_assignee")
	private String delegateAssignee;




	@TableField(typeHandler = Jackson3TypeHandler.class, value = "answer")
	private LinkedHashMap<String, Object> answer;




	private Boolean latest;




	@TableField(value = "create_at")
	private Date createAt;




	@TableField(value = "create_by")
	private String createBy;




	@TableField(value = "update_at")
	private Date updateAt;




	@TableField(value = "update_by")
	private String updateBy;

	@TableField(exist = false)
	private static final long serialVersionUID = 1L;

}