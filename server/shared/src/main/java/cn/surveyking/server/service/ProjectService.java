package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectStatusRequest;
import cn.surveyking.server.domain.dto.ProjectView;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;

/**
 * @author javahuang
 * @date 2021/8/2
 */
public interface ProjectService {

	PaginationResponse<ProjectView> listProject(ProjectQuery filter);

	@Cacheable(value = CacheConsts.projectCache, key = "#id", condition = "#p0!=null", unless = "#result == null")
	ProjectView getProject(String id);

	ProjectView addProject(ProjectRequest request);

	@CacheEvict(value = CacheConsts.projectCache, key = "#request.id")
	void updateProject(ProjectRequest request);

	/**
	 * 只更新发布状态（开启/关闭收集），由 project:publish 权限控制
	 */
	void updateProjectStatus(ProjectStatusRequest request);

	@CacheEvict(value = CacheConsts.projectCache, key = "#request.id")
	void deleteProject(ProjectRequest id);

	ProjectSetting getSetting(ProjectQuery filter);

	List<ProjectView> getDeleted(ProjectQuery query);

	void batchDestroyProject(ProjectRequest request);

	void restoreProject(ProjectRequest request);

}
