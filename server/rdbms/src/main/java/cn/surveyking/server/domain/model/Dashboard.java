package cn.surveyking.server.domain.model;

import cn.surveyking.server.domain.dto.DashboardSetting;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;






@TableName(value = "t_dashboard")
@Data
public class Dashboard implements Serializable {




	@TableId(value = "id")
	private String id;








	@TableField(value = "`key`")
	private String key;








	@TableField(value = "`type`")
	private Integer type;




	@TableField(value = "project_id")
	private String projectId;




	@TableField(typeHandler = Jackson3TypeHandler.class, value = "setting")
	private DashboardSetting setting;




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