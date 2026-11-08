package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 班级管理页的班级树节点。
 *
 * <p>只暴露班级本身的展示字段；能不能分配老师由页面上的 class:grant 决定，不放进节点。
 */
@Data
public class ClassNodeView {

	private String id;

	private String name;

	private String parentId;

	/** 负责人（班主任）id */
	private String managerId;

	/** 负责人（班主任）姓名 */
	private String managerName;

	/** 本班直属成员数（主组 + 附加组，去重口径见 ClassServiceImpl） */
	private long memberCount;

	/** 组绑定的角色 id，班级设置弹窗回显用 */
	private List<String> roleIds;

	/** 组有效期（空=永久）；班级设置弹窗回显用 */
	private java.util.Date validFrom;

	private java.util.Date validTo;

	private List<ClassNodeView> children;

}
