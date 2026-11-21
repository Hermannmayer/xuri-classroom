package cn.surveyking.server.flow.domain.model;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;




@TableName(value = "t_flow_operation_user")
@Data
public class FlowOperationUser implements Serializable {




	@TableId(value = "id")
	private String id;




	@TableField(value = "operation_id")
	private String operationId;




	@TableField(value = "user_id")
	private String userId;




	@TableField(value = "group_id")
	private String groupId;




	@TableField(value = "link_type")
	private String linkType;




	@TableField(value = "latest")
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