package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.domain.dto.ProjectPartnerQuery;
import cn.surveyking.server.domain.dto.ProjectPartnerRequest;
import cn.surveyking.server.domain.dto.ProjectPartnerView;
import cn.surveyking.server.domain.dto.WhiteListRequest;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;

/**
 * @author javahuang
 * @date 2022/1/28
 */
public interface ProjectPartnerService {

	PaginationResponse<ProjectPartnerView> listProjectPartner(ProjectPartnerQuery query);

	@CacheEvict(cacheNames = CacheConsts.projectPermissionCacheName,
			key = "T(cn.surveyking.server.core.uitls.SecurityContextUtils).getUserId()")
	void addProjectPartner(ProjectPartnerRequest request);

	@CacheEvict(cacheNames = CacheConsts.projectPermissionCacheName,
			key = "T(cn.surveyking.server.core.uitls.SecurityContextUtils).getUserId()")
	void deleteProjectPartner(ProjectPartnerRequest request);

	/**
	 * 调整某个协作者的授权级别（1 只读 / 2 可编辑 / 3 可授权）。
	 *
	 * <p>只有「可授权」（access_level=3）的人能调；只允许改 type=2 的协作者记录。
	 */
	@CacheEvict(cacheNames = CacheConsts.projectPermissionCacheName,
			key = "T(cn.surveyking.server.core.uitls.SecurityContextUtils).getUserId()")
	void updateProjectPartner(ProjectPartnerRequest request);

	/**
	 * 授权闸门：管理员、所有者，或被授到「可授权」（access_level=3）的协作者（含按用户组授权）。
	 */
	void assertCanGrant(String projectId);

	/**
	 * 当前用户在该项目上的授权级别：0 无权限，1 只读，2 可编辑，3 可授权。
	 */
	int accessLevel(String projectId);

	void deleteAllProjectPartners(List<String> projectIds);

	void assertProjectOwner(String projectId);

	@Cacheable(cacheNames = CacheConsts.projectPermissionCacheName,
			key = "T(cn.surveyking.server.core.uitls.SecurityContextUtils).getUserId()")
	List<String> getProjectPerms();

	void downloadPartner(ProjectPartnerQuery request);

	void importPartner(WhiteListRequest request);

}
