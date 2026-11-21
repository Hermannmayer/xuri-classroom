package cn.surveyking.server.flow.domain.model;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;




@TableName(value = "t_flow_entry_publish", autoResultMap = true)
@Data
public class FlowEntryPublish implements Serializable {




	@TableId(value = "id")
	private String id;




	@TableField(value = "entry_id")
	private String entryId;




	@TableField(value = "process_definition_id")
	private String processDefinitionId;




	@TableField(value = "publish_version")
	private Integer publishVersion;




	@TableField(value = "active_status")
	private Boolean activeStatus;




	@TableField(value = "main_version")
	private Boolean mainVersion;




	@TableField(value = "publish_time")
	private Date publishTime;




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