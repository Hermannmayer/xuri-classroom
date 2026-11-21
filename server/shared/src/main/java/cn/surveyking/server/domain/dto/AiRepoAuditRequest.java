package cn.surveyking.server.domain.dto;

import lombok.Data;









@Data
public class AiRepoAuditRequest {


	private String repoId;


	private String chapter;


	private java.util.List<String> templateIds;


	private Integer limit;


	private Boolean includeDuplicates;


	private Boolean includeAnalysis;

}
