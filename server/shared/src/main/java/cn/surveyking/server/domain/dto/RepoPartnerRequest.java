package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

@Data
public class RepoPartnerRequest {

	/** 单个成员 id（调整授权级别时用，与 ids 区分） */
	private String id;

	private List<String> ids;

	private String repoId;

	/** 授权级别：1 只读 / 2 可编辑（默认）/ 3 可授权 */
	private Integer accessLevel;

	private List<String> userIds;

	/**
	 * 授权到用户组(t_dept.id)：组员自动继承，不必逐人快照
	 */
	private String deptId;

}
