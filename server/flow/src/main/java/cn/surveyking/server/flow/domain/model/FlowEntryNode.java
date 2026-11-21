package cn.surveyking.server.flow.domain.model;

import cn.surveyking.server.flow.domain.dto.FlowNodeSetting;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;
import java.util.LinkedHashMap;






@TableName(value = "t_flow_entry_node", autoResultMap = true)
@Data
public class FlowEntryNode implements Serializable {




	@TableId(value = "id")
	private String id;




	@TableField(value = "name")
	private String name;




	@TableField(value = "project_id")
	private String projectId;




	@TableField(value = "task_type")
	private Integer taskType;




	@TableField(typeHandler = Jackson3TypeHandler.class, value = "field_permission")
	private LinkedHashMap<String, Integer> fieldPermission;




	@TableField(typeHandler = Jackson3TypeHandler.class, value = "setting")
	private FlowNodeSetting setting;




	@TableField(typeHandler = Jackson3TypeHandler.class, value = "identity")
	private String[] identity;




	@TableField(value = "expression")
	private String expression;




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