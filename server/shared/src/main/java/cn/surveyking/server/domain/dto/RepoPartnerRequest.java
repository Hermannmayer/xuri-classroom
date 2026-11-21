package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

@Data
public class RepoPartnerRequest {


	private String id;

	private List<String> ids;

	private String repoId;


	private Integer accessLevel;

	private List<String> userIds;




	private String deptId;

}
