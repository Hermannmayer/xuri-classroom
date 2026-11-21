package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;















@Data
@TableName(value = "t_audit_log", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class AuditLog extends BaseModel {


	private String action;


	private String targetId;


	private String targetName;


	private String detail;


	private String beforeJson;


	private String afterJson;


	private String source;


	private String requestId;


	private String ip;

}
