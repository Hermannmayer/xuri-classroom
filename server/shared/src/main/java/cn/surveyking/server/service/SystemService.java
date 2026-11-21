package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.domain.dto.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;

import java.util.List;





public interface SystemService {

	@Cacheable(value = CacheConsts.commonCacheName, key = "'systemInfo'")
	SystemInfo getSystemInfo();

	@Caching(evict = { @CacheEvict(value = CacheConsts.commonCacheName, key = "'systemInfo'"),
			@CacheEvict(value = CacheConsts.commonCacheName, key = "'aiInfo'") })
	void updateSystemInfo(SystemInfoRequest request);

	SystemInfo.UpdateStatus getUpdateStatus();

	@CacheEvict(value = CacheConsts.commonCacheName, key = "'systemInfo'")
	void saveUpdateStatus(SystemInfo.UpdateStatus status);

	@CacheEvict(value = CacheConsts.commonCacheName, key = "'systemInfo'")
	void clearUpdateStatus();

	PaginationResponse<RoleView> getRoles(RoleQuery query);

	/** 角色候选（只读）：只返回 id/name/code/status，不含权限明细；返回 全部角色（含停用，由调用方按 status 决定是否可选）。 */
	List<RoleOptionView> getRoleOptions();

	void createRole(RoleRequest request);

	void updateRole(RoleRequest request);

	void deleteRole(RoleRequest request);

	/** 权限目录：按分组返回可配置的权限点，供「角色权限矩阵」页面渲染；返回 按分组排列的权限目录。 */
	List<PermissionEnum.PermissionGroupView> getPermissionCatalog();

	void extractCodeDiffDbPermissions();

	@Cacheable(value = CacheConsts.commonCacheName, key = "'aiInfo'", unless = "#result == null")
	SystemInfo.AiSetting getSystemAiSetting();

	OAuthSetting getSystemOAuthSetting();

	OAuthSettingView getOAuthSettingView();

	@CacheEvict(value = CacheConsts.commonCacheName, allEntries = true)
	void updateOAuthSetting(OAuthSettingRequest request);

}
