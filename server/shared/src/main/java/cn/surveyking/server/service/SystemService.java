package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.domain.dto.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;

import java.util.List;

/**
 * @author javahuang
 * @date 2021/10/12
 */
public interface SystemService {

	@Cacheable(value = CacheConsts.commonCacheName, key = "'systemInfo'")
	SystemInfo getSystemInfo();

	@Caching(evict = { @CacheEvict(value = CacheConsts.commonCacheName, key = "'systemInfo'"),
			@CacheEvict(value = CacheConsts.commonCacheName, key = "'aiInfo'") })
	void updateSystemInfo(SystemInfoRequest request);

	PaginationResponse<RoleView> getRoles(RoleQuery query);

	void createRole(RoleRequest request);

	void updateRole(RoleRequest request);

	void deleteRole(RoleRequest request);

	/**
	 * 权限目录：按分组返回可配置的权限点，供「角色权限矩阵」页面渲染。
	 * 数据来源是 {@link PermissionEnum}，不是注解扫描，因此包含尚未接入注解的建议新增项。
	 * @return 按分组排列的权限目录
	 */
	List<PermissionEnum.PermissionGroupView> getPermissionCatalog();

	void extractCodeDiffDbPermissions();

	@Cacheable(value = CacheConsts.commonCacheName, key = "'aiInfo'", unless = "#result == null")
	SystemInfo.AiSetting getSystemAiSetting();

	OAuthSetting getSystemOAuthSetting();

	OAuthSettingView getOAuthSettingView();

	@CacheEvict(value = CacheConsts.commonCacheName, allEntries = true)
	void updateOAuthSetting(OAuthSettingRequest request);

}
