package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

@Data
public class RepoPartnerRequest {

	private List<String> ids;

	private String repoId;

	private List<String> userIds;

	/**
	 * 授权到用户组(t_dept.id)：组员自动继承，不必逐人快照
	 */
	private String deptId;

}
