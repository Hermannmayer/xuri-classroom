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





public interface ProjectPartnerService {

	PaginationResponse<ProjectPartnerView> listProjectPartner(ProjectPartnerQuery query);

	@CacheEvict(cacheNames = CacheConsts.projectPermissionCacheName,
			key = "T(cn.surveyking.server.core.uitls.SecurityContextUtils).getUserId()")
	void addProjectPartner(ProjectPartnerRequest request);

	@CacheEvict(cacheNames = CacheConsts.projectPermissionCacheName,
			key = "T(cn.surveyking.server.core.uitls.SecurityContextUtils).getUserId()")
	void deleteProjectPartner(ProjectPartnerRequest request);






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

	/**
	 * 当前用户能否访问某个项目的数据（数据页、报表、答卷列表这些 @EnableDataPerm 接口用）。
	 *
	 * <p>包含两条口径：项目协作者/所有者（走缓存的 {@link #getProjectPerms()}），以及
	 * 「这场考试分配给了自己带的班」（t_class_resource，实时算，不进缓存——班级分配变更后要立刻生效）。
	 * 后者只看<b>是否至少有一个班</b>，具体能看到哪些班的答卷由 {@code AnswerServiceImpl#listAnswer} 再收窄。
	 */
	boolean hasProjectAccess(String projectId);

	void downloadPartner(ProjectPartnerQuery request);

	void importPartner(WhiteListRequest request);

}
