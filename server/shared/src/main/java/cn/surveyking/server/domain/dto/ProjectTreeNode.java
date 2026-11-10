package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 考试/问卷分类树节点（文件夹 + 其下的考试/问卷）。
 *
 * <p>由 {@code ProjectService#tree()} 一次性返回整棵树：文件夹在前、同层按创建时间从近到远，
 * {@link #count} 是该节点下（含子文件夹）非 folder 项目的总数（folder 自身不计）。
 */
@Data
public class ProjectTreeNode {

	private String id;

	private String name;

	/** 上级文件夹 id；根节点为空（或 "0"） */
	private String parentId;

	/** folder=文件夹 survey=问卷 exam=考试 */
	private ProjectModeEnum mode;

	/** 该节点下（含子文件夹）非 folder 项目总数；叶子项目自身计 1 */
	private Integer count;

	private List<ProjectTreeNode> children = new ArrayList<>();

}
