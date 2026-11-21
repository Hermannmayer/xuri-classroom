package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;








@Data
public class AiRepoAuditApplyRequest {

	private String repoId;

	private List<AiRepoAuditView.Patch> patches;

}
