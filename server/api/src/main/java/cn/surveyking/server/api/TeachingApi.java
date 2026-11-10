package cn.surveyking.server.api;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.HTTPUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ClassMemberCreateRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportResult;
import cn.surveyking.server.domain.dto.ClassMemberUpdateRequest;
import cn.surveyking.server.domain.dto.ClassMemberView;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.ClassPartnerRequest;
import cn.surveyking.server.domain.dto.ClassResourceAssignRequest;
import cn.surveyking.server.domain.dto.ClassResourceDeleteRequest;
import cn.surveyking.server.domain.dto.ClassResourceUpdateRequest;
import cn.surveyking.server.domain.dto.ClassResourceView;
import cn.surveyking.server.domain.dto.ClassTeacherView;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;
import cn.surveyking.server.domain.dto.UserOptionView;
import cn.surveyking.server.service.ClassResourceService;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.TeachingService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 教学工作台：老师视角的「我的试卷 + 班级作答情况」。
 *
 * <p>与学员的「我的任务」区分开：这里只看自己参与的考试和班级统计，不出现
 * 练习记录 / 我的成绩这类学员入口。
 *
 * <p>班级相关读写统一走 {@link ClassService} 接口；学员导入、授权级别等新方法都已声明在接口上，
 * 不要为了省事直接注入实现类（JDK 代理场景下会拿不到 Bean）。
 */
@RestController
@RequestMapping("${api.prefix}/teaching")
@RequiredArgsConstructor
public class TeachingApi {

	/** 班级学员导入模板：放在 api 模块的 resources/template 下 */
	private static final String CLASS_MEMBER_TEMPLATE = "template/学员导入模板.xlsx";

	private final TeachingService teachingService;

	private final ClassService classService;

	private final ClassResourceService classResourceService;

	@GetMapping("/projects")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	public List<TeachingProjectView> myProjects() {
		return teachingService.listMyProjects(SecurityContextUtils.getUserId());
	}

	@GetMapping("/classes")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	public List<TeachingClassView> classes(@RequestParam String projectId) {
		return teachingService.listClasses(projectId);
	}

	/* ------ 班级管理 */

	/**
	 * 当前用户能看到的班级树。
	 *
	 * <p>班主任看自己创建/负责的班，老师看被授权的班，管理员与 class:grant 看全部；
	 * 被授权的班会自动补上祖先节点，保证树有路径可显示。节点上的 {@code manageable}
	 * 表示当前用户能不能改这个班的学员（只读授权为 false）。
	 */
	@GetMapping("/classes/tree")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public List<ClassNodeView> classTree(@RequestParam(required = false) String keyword) {
		return classService.listClassTree(keyword);
	}

	/**
	 * 新建班级。
	 *
	 * <p>老师有 {@code class:list} 就能建班：服务端固定 dept_type=class、不绑角色，
	 * create_by 由框架自动写成当前用户，建完就能在自己的班级树里看到。
	 */
	@PostMapping("/classes/create")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public void createClass(@RequestBody DeptRequest request) {
		classService.createClass(request);
	}

	/**
	 * 修改班级（名称 / 上级 / 有效期）。只能改自己「可管理」的班，
	 * 权限判定在 {@code ClassServiceImpl#updateClass}（管理员 / class:grant / 班主任 / 可管理授权）。
	 */
	@PostMapping("/classes/update")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public void updateClass(@RequestBody DeptRequest request) {
		classService.updateClass(request);
	}

	/* ------ 班级资源分配（P1：考试/问卷，按班级开放窗口） */

	/**
	 * 某班已分配的资源面板。
	 *
	 * <p>只有能管理这个班的人能看（服务层 assertManage）：面板就是写入口，读也不外包。
	 */
	@GetMapping("/classes/resources")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public List<ClassResourceView> classResources(@RequestParam String deptId,
			@RequestParam(required = false) String resourceType) {
		return classResourceService.list(deptId, resourceType);
	}

	/**
	 * 给班级分配考试/问卷。
	 *
	 * <p>body {@code {classId, resourceType:"project", resourceIds, startAt?, endAt?, status?}}。
	 * 班级窗口为空表示继承全局；非空必须落在项目全局窗口内（全局是硬上限）。已存在是 upsert。
	 */
	@PostMapping("/classes/resources/assign")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public void assignClassResource(@RequestBody ClassResourceAssignRequest request) {
		classResourceService.assign(request);
	}

	/**
	 * 修改一条分配：班级窗口与班级级开关。
	 *
	 * <p>body {@code {id, startAt?, endAt?, status?}}；startAt/endAt 传 null 表示回退到继承全局。
	 */
	@PostMapping("/classes/resources/update")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public void updateClassResource(@RequestBody ClassResourceUpdateRequest request) {
		classResourceService.update(request);
	}

	/** 取消班级对某个资源的分配 */
	@PostMapping("/classes/resources/delete")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public void deleteClassResource(@RequestBody ClassResourceDeleteRequest request) {
		classResourceService.delete(request);
	}

	@GetMapping("/classes/members")
	@PreAuthorize("hasAuthority('class:detail') or hasRole('admin')")
	public List<ClassMemberView> classMembers(@RequestParam String deptId) {
		return classService.listClassMembers(deptId);
	}

	/** 某班已分配的老师；同时用于「是否能看到分配入口」的判断 */
	@GetMapping("/classes/teachers")
	@PreAuthorize("hasAuthority('class:grant') or hasRole('admin')")
	public List<ClassTeacherView> classTeachers(@RequestParam String deptId) {
		return classService.listClassTeachers(deptId);
	}

	/** 可分配的老师候选（只读 id/姓名/组） */
	@GetMapping("/classes/teacher-options")
	@PreAuthorize("hasAuthority('class:grant') or hasRole('admin')")
	public List<UserOptionView> classTeacherOptions(@RequestParam(required = false) String keyword) {
		return classService.listTeacherOptions(keyword);
	}

	/**
	 * 分配 / 重新分配老师。
	 *
	 * <p>body {@code {deptId, userIds, accessLevel?}}：{@code accessLevel} 缺省按 1（只读）；
	 * 对已存在的 (dept_id, user_id) 是 upsert —— 会更新级别，而不是像以前那样直接跳过。
	 */
	@PostMapping("/classes/partner/create")
	@PreAuthorize("hasAuthority('class:grant') or hasRole('admin')")
	public void addClassPartners(@RequestBody ClassPartnerRequest request) {
		classService.addClassPartners(request);
	}

	/**
	 * 修改某条已授权老师的级别。
	 *
	 * <p>body {@code {deptId, id, accessLevel}}，{@code accessLevel} 只能是 1（只读）或 2（可管理）；
	 * {@code id} 必须是这个班自己的授权记录，否则拒绝。
	 */
	@PostMapping("/classes/partner/update")
	@PreAuthorize("hasAuthority('class:grant') or hasRole('admin')")
	public void updateClassPartner(@RequestBody ClassPartnerRequest request) {
		classService.updateClassPartner(request);
	}

	@PostMapping("/classes/partner/delete")
	@PreAuthorize("hasAuthority('class:grant') or hasRole('admin')")
	public void deleteClassPartner(@RequestBody ClassPartnerRequest request) {
		classService.deleteClassPartner(request);
	}

	/**
	 * 班主任在自己可见的班里新增学员（角色固定为学员）。
	 *
	 * <p>登录账号 = 手机号，{@code phone} 必填且为 11 位大陆手机号；body 里的 {@code username}
	 * 仅为兼容旧前端保留，服务端忽略。只读授权（access_level=1）的老师会被 403 拒绝。
	 */
	@PostMapping("/classes/member/create")
	@PreAuthorize("hasAuthority('class:member:create') or hasRole('admin')")
	public void createClassMember(@RequestBody ClassMemberCreateRequest request) {
		classService.createClassMember(request);
	}

	@PostMapping("/classes/member/update")
	@PreAuthorize("hasAuthority('class:member:update') or hasRole('admin')")
	public void updateClassMember(@RequestBody ClassMemberUpdateRequest request) {
		classService.updateClassMember(request);
	}

	@PostMapping("/classes/member/delete")
	@PreAuthorize("hasAuthority('class:member:delete') or hasRole('admin')")
	public void deleteClassMember(@RequestBody ClassMemberUpdateRequest request) {
		classService.deleteClassMember(request.getDeptId(), request.getId());
	}

	/**
	 * 班级学员批量导入（multipart/form-data：deptId + file）。
	 *
	 * <p>模板第 1 行表头，数据列：0 姓名（必填）、1 手机号（必填，同时是登录账号）、
	 * 2 初始密码（可空，默认 12345678）、3 邮箱（可空）。整批事务：任一行失败全部回滚，
	 * 异常信息是「第 N 行：原因」。返回 {@code {imported: 成功行数}}。
	 */
	@PostMapping(value = "/classes/member/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize("hasAuthority('class:member:create') or hasRole('admin')")
	public ClassMemberImportResult importClassMembers(ClassMemberImportRequest request) {
		return classService.importClassMembers(request);
	}

	/** 下载班级学员导入模板（xlsx） */
	@GetMapping("/classes/member/template")
	@PreAuthorize("hasAuthority('class:member:create') or hasRole('admin')")
	public ResponseEntity<Resource> classMemberTemplate() {
		ClassPathResource resource = new ClassPathResource(CLASS_MEMBER_TEMPLATE);
		if (!resource.exists()) {
			throw new ErrorCodeException(ErrorCode.FileNotExists);
		}
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, HTTPUtils.getContentDispositionValue("学员导入模板.xlsx"))
				.contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
				.body(resource);
	}

}
