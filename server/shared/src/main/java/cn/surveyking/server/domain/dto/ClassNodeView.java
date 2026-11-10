package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 班级管理页的班级树节点。
 *
 * <p>能不能分配老师由页面上的 class:grant 决定，不放进节点；能不能改本班学员则由
 * {@link #manageable} 表达（管理员 / class:grant / 创建人或负责人 / 被授了「可管理」级别）。
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

	/**
	 * 当前用户能否修改这个班（增删改学员 / 批量导入）。
	 *
	 * <p>true 的条件（服务端口径，见 ClassServiceImpl#assertClassManage）：
	 * 管理员或 class:grant；本班或任一祖先班是自己创建/负责的；本班或任一祖先班上有
	 * access_level=2 的授权。false 时页面应把「添加/编辑/删除学员」置灰。
	 */
	private boolean manageable;

	private List<ClassNodeView> children;

}
