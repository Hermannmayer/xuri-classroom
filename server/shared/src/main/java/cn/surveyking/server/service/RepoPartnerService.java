package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.RepoPartnerQuery;
import cn.surveyking.server.domain.dto.RepoPartnerRequest;
import cn.surveyking.server.domain.dto.RepoPartnerView;

public interface RepoPartnerService {

	PaginationResponse<RepoPartnerView> listRepoPartner(RepoPartnerQuery query);

	void addRepoPartner(RepoPartnerRequest request);

	void deleteRepoPartner(RepoPartnerRequest request);

	/** 调整某个成员/用户组的授权级别（1 只读 / 2 可编辑 / 3 可授权） */
	void updateRepoPartner(RepoPartnerRequest request);

	boolean hasPracticePermission(String repoId, String userId);

}
