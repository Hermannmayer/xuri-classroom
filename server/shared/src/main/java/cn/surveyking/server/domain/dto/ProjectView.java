package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.Date;
import java.util.LinkedHashMap;





@Data
public class ProjectView {

	private String id;

	private String name;


	private String category;

	private ProjectModeEnum mode;

	private Integer status;

	private SurveySchema survey;

	private ProjectSetting setting;

	private Long total;


	private Integer pendingCount;


	private Integer totalOfToday;


	private Long lastUpdate;


	private Long averageDuration;

	private Date createAt;

	private Date updateAt;

	private String parentId;

	private String answerId;

	private LinkedHashMap<String, Object> tempAnswer;

}
