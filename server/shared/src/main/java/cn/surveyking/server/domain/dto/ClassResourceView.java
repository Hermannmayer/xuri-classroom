package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.Date;












@Data
public class ClassResourceView {

	private String id;

	private String classId;

	private String className;


	private String resourceType;

	private String resourceId;


	private String shareToken;


	private String resourceName;


	private ProjectModeEnum resourceMode;


	private Integer status;


	private ClassResourceSetting settings;


	private Date startAt;


	private Date endAt;


	private Date globalStartAt;


	private Date globalEndAt;

	private String assignedBy;

	private String assignedByName;


	private long answerCount;


	private Double avgScore;


	private String effectiveStatus;

}
