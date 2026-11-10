package cn.surveyking.server.api;

import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * @author javahuang
 * @date 2021/8/6
 */
@RestController
@RequestMapping("${api.prefix}/project")
@RequiredArgsConstructor
public class ProjectApi {

	private final ProjectService projectService;

	private final ProjectPartnerService projectPartnerService;

	private final UserService userService;

	private final PositionService positionService;

	private final DeptService deptService;

	private final RoleService roleService;

	private final DictService dictService;

	private final TemplateService templateService;

	private final RepoService repoService;

	private final TagService tagService;

	/**
	 * 获取项目列表
	 * @param query 分页查询参数
	 * @return 项目列表分页结果
	 */
	@GetMapping("/list")
	@PreAuthorize("hasAuthority('project:list') or hasAuthority('exercise:list')")
	public PaginationResponse<ProjectView> listProject(ProjectQuery query) {
		return projectService.listProject(query);
	}

	/**
	 * 考试/问卷分类列表（分类名 + 数量），用于列表页的分类筛选。
	 *
	 * <p>只统计当前用户可见的项目；空/空白分类归到「未分类」，按数量降序返回。
	 */
	@GetMapping("/categories")
	@PreAuthorize("hasAuthority('project:list') or hasRole('admin')")
	public List<ProjectCategoryView> categories() {
		return projectService.listCategories();
	}

	/**
	 * 考试/问卷分类树：文件夹 + 其下的考试/问卷，count 是子树里的项目数。
	 *
	 * <p>可见性与 /list 一致；父文件夹不可见的项目会作为根节点返回。
	 */
	@GetMapping("/tree")
	@PreAuthorize("hasAuthority('project:list') or hasRole('admin')")
	public List<ProjectTreeNode> tree() {
		return projectService.tree();
	}

	/**
	 * 获取项目信息
	 * @param id 项目 id
	 * @return
	 */
	@GetMapping
	@PreAuthorize("hasAuthority('project:detail')")
	@EnableDataPerm(key = "#id")
	public ProjectView getProject(String id) {
		return projectService.getProject(id);
	}

	/**
	 * 获取项目设置
	 * @param query
	 * @return
	 */
	@GetMapping("/setting")
	@PreAuthorize("hasAuthority('project:detail')")
	@EnableDataPerm(key = "#query.id")
	public ProjectSetting getSetting(ProjectQuery query) {
		return projectService.getSetting(query);
	}

	/**
	 * 添加项目
	 * @param project
	 * @return
	 */
	@PostMapping("/create")
	@PreAuthorize("hasAuthority('project:create')")
	public ProjectView addProject(@RequestBody ProjectRequest project) {
		return projectService.addProject(project);
	}

	/**
	 * 更新项目
	 * @param project
	 */
	@PostMapping("/update")
	@PreAuthorize("hasAuthority('project:update')")
	@EnableDataPerm(key = "#project.id")
	public void updateProject(@RequestBody ProjectRequest project) {
		projectService.updateProject(project);
	}

	/**
	 * 只改发布状态（开启/关闭收集）。独立端点 + 独立权限，老师可以「只发不编」。
	 * @param request id + status
	 */
	@PostMapping("/status")
	@PreAuthorize("hasAuthority('project:publish') or hasRole('admin')")
	@EnableDataPerm(key = "#request.id")
	public void updateProjectStatus(@RequestBody ProjectStatusRequest request) {
		projectService.updateProjectStatus(request);
	}

	/**
	 * 删除项目
	 * @param project
	 */
	@PostMapping("/delete")
	@PreAuthorize("hasAuthority('project:delete')")
	@EnableDataPerm(key = "#project.id")
	public void deleteProject(@RequestBody ProjectRequest project) {
		projectService.deleteProject(project);
	}

	/**
	 * 获取项目参与者列表
	 * @param query
	 * @return
	 */
	@GetMapping("/partner/list")
	@PreAuthorize("hasAuthority('project:detail')")
	@EnableDataPerm(key = "#query.projectId")
	public PaginationResponse<ProjectPartnerView> listProjectPartner(ProjectPartnerQuery query) {
		return projectPartnerService.listProjectPartner(query);
	}

	/**
	 * 添加项目参与者
	 * @param request
	 */
	@PostMapping("/partner/create")
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	@EnableDataPerm(key = "#request.projectId")
	public void addProjectPartner(@RequestBody ProjectPartnerRequest request) {
		// 授权闸门在 service（owner / admin / access_level=3 的协作者），这里不再限定 owner，
		// 否则「可授权」的协作者没法把自己的班/学员继续加进来
		projectPartnerService.addProjectPartner(request);
	}

	/**
	 * 删除项目参与者
	 * @param request
	 */
	@PostMapping("/partner/delete")
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	@EnableDataPerm(key = "#request.projectId")
	public void deleteProjectPartner(@RequestBody ProjectPartnerRequest request) {
		projectPartnerService.deleteProjectPartner(request);
	}

	/**
	 * 调整项目成员的授权级别（1 只读 / 2 可编辑 / 3 可授权）。
	 *
	 * <p>权限由 {@code ProjectPartnerService#assertCanGrant} 判定（owner / admin / access_level=3 的协作者）；
	 * 这里不加 @EnableDataPerm：请求体可能只带 id + accessLevel，拿不到 projectId 的 SpEL 会直接 403。
	 */
	@PostMapping("/partner/update")
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	public void updateProjectPartner(@RequestBody ProjectPartnerRequest request) {
		projectPartnerService.updateProjectPartner(request);
	}

	/**
	 * 下载项目参与者列表
	 * @param query
	 */
	@GetMapping("/partner/download")
	// 名单里有手机号等个人信息，从 project:detail（所有能看到项目的人）收紧到 project:partner
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	@EnableDataPerm(key = "#query.projectId")
	public void downloadPartner(ProjectPartnerQuery query) {
		projectPartnerService.downloadPartner(query);
	}

	/**
	 * 导入项目参与者列表
	 * @param request
	 */
	@PostMapping("/partner/import")
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	@EnableDataPerm(key = "#request.projectId")
	public void importPartner(@RequestBody WhiteListRequest request) {
		// 与 create/delete 对齐：只有项目所有者能导入名单，避免协作者给自己扩权
		projectPartnerService.assertProjectOwner(request.getProjectId());
		projectPartnerService.importPartner(request);
	}

	/**
	 * 获取回收站里的项目列表
	 * @param query
	 * @return
	 */
	@GetMapping("/trash")
	@PreAuthorize("hasAuthority('project:list')")
	public List<ProjectView> getDeleted(ProjectQuery query) {
		return projectService.getDeleted(query);
	}

	/**
	 * 从回收站彻底移除项目
	 * @param request
	 */
	@PostMapping("/destroy")
	// 彻底删除与「新建/恢复」分开：老师可以建、可以恢复，但不能物理清空回收站。
	@PreAuthorize("hasAuthority('project:delete')")
	public void batchDestroyProject(@RequestBody ProjectRequest request) {
		projectService.batchDestroyProject(request);
	}

	/**
	 * 从回收站里面恢复项目
	 * @param request
	 */
	@PostMapping("/restore")
	@PreAuthorize("hasAuthority('project:create')")
	public void restoreProject(@RequestBody ProjectRequest request) {
		projectService.restoreProject(request);
	}

	/**
	 * 编辑器里面获取用户信息
	 * @param request
	 * @return
	 */
	@PostMapping("/selectUser")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<UserInfo> selectUser(@RequestBody SelectUserRequest request) {
		return userService.selectUsers(request);
	}

	/**
	 * 编辑器里面获取部门信息
	 * @param request
	 * @return
	 */
	@PostMapping("/selectDept")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<DeptView> selectDept(@RequestBody SelectDeptRequest request) {
		return deptService.listDept(request);
	}

	/**
	 * 编辑器里面获取角色信息
	 * @param request
	 * @return
	 */
	@PostMapping("/selectRole")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<RoleView> selectRole(@RequestBody SelectRoleRequest request) {
		return roleService.selectRoles(request);
	}

	/**
	 * 编辑器里面获取岗位信息
	 * @param request
	 * @return
	 */
	@PostMapping("/selectPosition")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<PositionView> selectPosition(@RequestBody SelectPositionRequest request) {
		return positionService.selectPositions(request);
	}

	/**
	 * 编辑器里面获取字典
	 * @return
	 */
	@PostMapping("/selectDict")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<CommDictView> selectDict() {
		return dictService.selectDict();
	}

	/**
	 * 编辑器里面获取题库模板
	 * @param request
	 * @return
	 */
	@PostMapping("/selectTemplate")
	public Map<String, List<TemplateView>> selectTemplate(@RequestBody SelectTemplateRequest request) {
		return templateService.selectTemplate(request);
	}

	/**
	 * 编辑器里面获取题库
	 * @param request
	 * @return
	 */
	@PostMapping("/selectRepo")
	public List<RepoView> selectRepo(@RequestBody SelectRepoRequest request) {
		return repoService.selectRepo(request);
	}

	/**
	 * 编辑器里面获取标签
	 * @param request
	 * @return
	 */
	@PostMapping("/selectTag")
	public Set<String> selectTag(@RequestBody SelectTagRequest request) {
		return tagService.selectTag(request);
	}

}