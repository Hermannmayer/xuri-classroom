package cn.surveyking.server.flow.domain.model;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;






@TableName(value = "t_flow_instance", autoResultMap = true)
@Data
public class FlowInstance implements Serializable {




	@TableId(value = "id")
	private String id;




	@TableField(value = "project_id")
	private String projectId;




	@TableField(value = "answer_id")
	private String answerId;




	@TableField(value = "status")
	private Integer status;




	@TableField(value = "approval_stage")
	private String approvalStage;




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