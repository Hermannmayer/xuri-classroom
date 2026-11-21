package cn.surveyking.server.flow.domain.dto;

import cn.surveyking.server.domain.dto.DeptView;
import cn.surveyking.server.domain.dto.FileView;
import cn.surveyking.server.domain.dto.UserInfo;
import lombok.Data;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;





@Data
public class FlowTaskView {

	private String id;

	private String projectId;


	private Integer status;

	private String approvalStage;


	private String approvalType;


	private String activityId;

	private Date createAt;


	private Date updateAt;

	private UserInfo createUser;

	private String processInstanceId;

	private String answerId;




	LinkedHashMap<String, Integer> fieldPermission;


	private Boolean latest;

	private LinkedHashMap<String, Object> answer;

	private List<FileView> attachment;

	private List<UserInfo> users;

	private List<DeptView> depts;

}
