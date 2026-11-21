package cn.surveyking.server.api;

import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.impl.ProjectStatisticsService;
import cn.surveyking.server.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;





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

	private final ProjectStatisticsService projectStatisticsService;

	/** 获取项目列表；返回 项目列表分页结果 */
	@GetMapping("/list")
	@PreAuthorize("hasAuthority('project:list') or hasAuthority('exercise:list')")
	public PaginationResponse<ProjectView> listProject(ProjectQuery query) {
		return projectService.listProject(query);
	}

	/** 考试/问卷分类列表（分类名 + 数量），用于列表页的分类筛选 */
	@GetMapping("/categories")
	@PreAuthorize("hasAuthority('project:list') or hasRole('admin')")
	public List<ProjectCategoryView> categories() {
		return projectService.listCategories();
	}

	/** 考试/问卷分类树：文件夹 + 其下的考试/问卷，count 是子树里的项目数 */
	@GetMapping("/tree")
	@PreAuthorize("hasAuthority('project:list') or hasRole('admin')")
	public List<ProjectTreeNode> tree() {
		return projectService.tree();
	}






	@GetMapping
	@PreAuthorize("hasAuthority('project:detail')")
	@EnableDataPerm(key = "#id")
	public ProjectView getProject(String id) {
		return projectService.getProject(id);
	}

	/** 总面板：匿名答卷总量 + 按班级拆分（公开链接匿名无班级归入 unassignedAnonymous） */
	@GetMapping("/class-anonymous-stats")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	@EnableDataPerm(key = "#projectId")
	public ProjectClassAnonymousStatsView classAnonymousStats(@RequestParam String projectId) {
		return projectStatisticsService.statClassAnonymous(projectId);
	}






	@GetMapping("/setting")
	@PreAuthorize("hasAuthority('project:detail')")
	@EnableDataPerm(key = "#query.id")
	public ProjectSetting getSetting(ProjectQuery query) {
		return projectService.getSetting(query);
	}






	@PostMapping("/create")
	@PreAuthorize("hasAuthority('project:create')")
	public ProjectView addProject(@RequestBody ProjectRequest project) {
		return projectService.addProject(project);
	}





	@PostMapping("/update")
	@PreAuthorize("hasAuthority('project:update')")
	@EnableDataPerm(key = "#project.id")
	public void updateProject(@RequestBody ProjectRequest project) {
		projectService.updateProject(project);
	}

	/** 只改发布状态（开启/关闭收集） */
	@PostMapping("/status")
	@PreAuthorize("hasAuthority('project:publish') or hasRole('admin')")
	@EnableDataPerm(key = "#request.id")
	public void updateProjectStatus(@RequestBody ProjectStatusRequest request) {
		projectService.updateProjectStatus(request);
	}





	@PostMapping("/delete")
	@PreAuthorize("hasAuthority('project:delete')")
	@EnableDataPerm(key = "#project.id")
	public void deleteProject(@RequestBody ProjectRequest project) {
		projectService.deleteProject(project);
	}






	@GetMapping("/partner/list")
	@PreAuthorize("hasAuthority('project:detail')")
	@EnableDataPerm(key = "#query.projectId")
	public PaginationResponse<ProjectPartnerView> listProjectPartner(ProjectPartnerQuery query) {
		return projectPartnerService.listProjectPartner(query);
	}

	/** 添加项目参与者 */
	@PostMapping("/partner/create")
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	@EnableDataPerm(key = "#request.projectId")
	public void addProjectPartner(@RequestBody ProjectPartnerRequest request) {


		projectPartnerService.addProjectPartner(request);
	}

	/** 删除项目参与者 */
	@PostMapping("/partner/delete")
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	@EnableDataPerm(key = "#request.projectId")
	public void deleteProjectPartner(@RequestBody ProjectPartnerRequest request) {
		projectPartnerService.deleteProjectPartner(request);
	}

	/** 调整项目成员的授权级别（1 只读 / 2 可编辑 / 3 可授权） */
	@PostMapping("/partner/update")
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	public void updateProjectPartner(@RequestBody ProjectPartnerRequest request) {
		projectPartnerService.updateProjectPartner(request);
	}





	@GetMapping("/partner/download")
	// 名单里有手机号等个人信息，从 project:detail（所有能看到项目的人）收紧到 project:partner
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	@EnableDataPerm(key = "#query.projectId")
	public void downloadPartner(ProjectPartnerQuery query) {
		projectPartnerService.downloadPartner(query);
	}

	/** 导入项目参与者列表 */
	@PostMapping("/partner/import")
	@PreAuthorize("hasAuthority('project:partner') or hasRole('admin')")
	@EnableDataPerm(key = "#request.projectId")
	public void importPartner(@RequestBody WhiteListRequest request) {

		projectPartnerService.assertProjectOwner(request.getProjectId());
		projectPartnerService.importPartner(request);
	}






	@GetMapping("/trash")
	@PreAuthorize("hasAuthority('project:list')")
	public List<ProjectView> getDeleted(ProjectQuery query) {
		return projectService.getDeleted(query);
	}





	@PostMapping("/destroy")

	@PreAuthorize("hasAuthority('project:delete')")
	public void batchDestroyProject(@RequestBody ProjectRequest request) {
		projectService.batchDestroyProject(request);
	}





	@PostMapping("/restore")
	@PreAuthorize("hasAuthority('project:create')")
	public void restoreProject(@RequestBody ProjectRequest request) {
		projectService.restoreProject(request);
	}






	@PostMapping("/selectUser")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<UserInfo> selectUser(@RequestBody SelectUserRequest request) {
		return userService.selectUsers(request);
	}






	@PostMapping("/selectDept")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<DeptView> selectDept(@RequestBody SelectDeptRequest request) {
		return deptService.listDept(request);
	}






	@PostMapping("/selectRole")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<RoleView> selectRole(@RequestBody SelectRoleRequest request) {
		return roleService.selectRoles(request);
	}






	@PostMapping("/selectPosition")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<PositionView> selectPosition(@RequestBody SelectPositionRequest request) {
		return positionService.selectPositions(request);
	}





	@PostMapping("/selectDict")
	@PreAuthorize("hasAnyAuthority('project:detail','project:create','project:update')")
	public List<CommDictView> selectDict() {
		return dictService.selectDict();
	}

	/** 编辑器里面获取题库模板 */
	@PostMapping("/selectTemplate")
	public Map<String, List<TemplateView>> selectTemplate(@RequestBody SelectTemplateRequest request) {
		return templateService.selectTemplate(request);
	}

	/** 编辑器里面获取题库 */
	@PostMapping("/selectRepo")
	public List<RepoView> selectRepo(@RequestBody SelectRepoRequest request) {
		return repoService.selectRepo(request);
	}

	/** 编辑器里面获取标签 */
	@PostMapping("/selectTag")
	public Set<String> selectTag(@RequestBody SelectTagRequest request) {
		return tagService.selectTag(request);
	}

}