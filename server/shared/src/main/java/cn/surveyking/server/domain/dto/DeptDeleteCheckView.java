package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 删除用户组前的预检信息：让前端在弹窗里说清楚「为什么不能删/成员去哪」。
 *
 * <p>{@code lastDept=true} 只用于提示「这是最后一个组，删完大家会变成未分组」，
 * 不再阻止删除。
 *
 * @author backend-ops
 */
@Data
public class DeptDeleteCheckView {

	private String id;

	/** 组名 */
	private String name;

	/** 直接子组数量（孙组不算） */
	private int childCount;

	/** 直接子组名称（弹窗里说明「还有哪些子组」用） */
	private List<String> childNames;

	/** 主组成员数（t_user.dept_id 命中） */
	private long primaryMemberCount;

	/** 附加组成员数（t_user_dept 命中） */
	private long extraMemberCount;

	/** 成员姓名（主组 + 附加组去重，最多 10 个） */
	private List<String> memberNames;

	/** 当前未删除的用户组是否只剩这一个（只提示，不阻止删除） */
	private boolean lastDept;

}
