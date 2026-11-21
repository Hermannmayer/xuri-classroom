package cn.surveyking.server.flow.domain.model;

import cn.surveyking.server.flow.domain.handler.FlowEntryNodeTypeHandler;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;
import java.util.List;






@TableName(value = "t_flow_entry", autoResultMap = true)
@Data
public class FlowEntry implements Serializable {




	@TableId(value = "id")
	private String id;




	@TableField(value = "project_id")
	private String projectId;




	@TableField(value = "process_definition_id")
	private String processDefinitionId;




	@TableField(value = "deploy_id")
	private String deployId;




	@TableField(value = "bpmn_xml")
	private String bpmnXml;




	@TableField(typeHandler = FlowEntryNodeTypeHandler.class, value = "nodes")
	private List<FlowEntryNode> nodes;




	@TableField(value = "icon")
	private String icon;




	@TableField(value = "status")
	private Integer status;




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