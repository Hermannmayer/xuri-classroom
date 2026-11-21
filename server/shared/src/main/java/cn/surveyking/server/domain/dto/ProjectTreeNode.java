package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;







@Data
public class ProjectTreeNode {

	private String id;

	private String name;


	private String parentId;


	private ProjectModeEnum mode;


	private Integer count;

	private List<ProjectTreeNode> children = new ArrayList<>();

}
