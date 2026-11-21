package cn.surveyking.server.flow.domain.dto;

import cn.surveyking.server.domain.dto.UserInfo;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.util.Date;
import java.util.List;





@Data
public class FlowOperationView {

	private String id;

	private String activityId;

	private String newActivityId;




	private String activityName;

	private String newActivityName;

	private String comment;




	@JsonFormat(pattern = "yyyy-MM-dd HH:mm")
	private Date createAt;

	private String createBy;

	private UserInfo auditUser;

	private String approvalType;

	private String approvalTypeName;




	private List<UserInfo> waitAuditUserList;




	private List<UserInfo> ccUserList;

}
