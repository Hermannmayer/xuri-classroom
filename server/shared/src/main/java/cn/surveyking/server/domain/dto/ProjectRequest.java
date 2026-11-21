package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.List;





@Data
public class ProjectRequest {

	private String id;

	private String name;


	private String category;

	private ProjectModeEnum mode;

	private SurveySchema survey;

	private ProjectSetting setting;


	private Integer status;

	private String belongGroup;

	private String settingKey;

	private Object settingValue;

	private String parentId;

	private List<String> ids;

}
