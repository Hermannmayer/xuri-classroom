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

	/**
	 * 当前用户能否直接打开这个班。
	 *
	 * <p>false 表示它只是为了让被授权的子班有路径可显示而补出来的祖先节点，
	 * 点它查成员会 403；前端据此禁用选择、显示成灰色。
	 */
	private boolean accessible = true;

	private List<ClassNodeView> children;

}
