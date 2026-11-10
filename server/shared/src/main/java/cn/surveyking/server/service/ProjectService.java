package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.domain.dto.ProjectCategoryView;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectStatusRequest;
import cn.surveyking.server.domain.dto.ProjectTreeNode;
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

	/**
	 * 考试/问卷分类树（文件夹 + 叶子项目）。
	 *
	 * <p>可见性与 {@link #listProject(ProjectQuery)} 一致：管理员全量；其余人只看自己创建的、
	 * 或被授权（t_project_partner type 1/2）的项目；父文件夹不可见时，子项目会退化成根节点返回。
	 */
	List<ProjectTreeNode> tree();

	/**
	 * 分类列表（分类名 + 该项目数），只统计当前用户可见的项目。
	 *
	 * <p>可见性与 {@link #listProject(ProjectQuery)} 一致；空/空白分类统一归到「未分类」，
	 * 结果按 count 降序、name 升序。
	 */
	List<ProjectCategoryView> listCategories();

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
