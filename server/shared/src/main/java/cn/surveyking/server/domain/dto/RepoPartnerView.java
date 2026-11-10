package cn.surveyking.server.domain.dto;

import lombok.Data;

@Data
public class RepoPartnerView {

	private String id;

	private UserInfo user;

	private String userId;

	/** 被授权的用户组 id（按组授权时 userId 为空） */
	private String deptId;

	/** 用户组名称，列表展示用 */
	private String deptName;

	/** 授权级别：1 只读 / 2 可编辑 / 3 可授权 */
	private Integer accessLevel;

}
