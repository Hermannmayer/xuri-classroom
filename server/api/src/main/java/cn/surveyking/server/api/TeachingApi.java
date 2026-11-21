package cn.surveyking.server.api;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.HTTPUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AddExistingStudentsRequest;
import cn.surveyking.server.domain.dto.AddExistingStudentsResult;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ClassMemberCreateRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportResult;
import cn.surveyking.server.domain.dto.ClassMemberUpdateRequest;
import cn.surveyking.server.domain.dto.ClassMemberView;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.ClassPartnerRequest;
import cn.surveyking.server.domain.dto.ClassResourceAssignRequest;
import cn.surveyking.server.domain.dto.ClassShareLinkRequest;
import cn.surveyking.server.domain.dto.ClassShareLinkView;
import cn.surveyking.server.domain.dto.ClassResourceDeleteRequest;
import cn.surveyking.server.domain.dto.ClassResourceUpdateRequest;
import cn.surveyking.server.domain.dto.ClassResourceView;
import cn.surveyking.server.domain.dto.ClassTeacherView;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.PendingStudentApproveRequest;
import cn.surveyking.server.domain.dto.StudentClassAssignRequest;
import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;
import cn.surveyking.server.domain.dto.UnsubmittedStudentView;
import cn.surveyking.server.domain.dto.UserOptionView;
import cn.surveyking.server.service.AnswerService;
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










@RestController
@RequestMapping("${api.prefix}/teaching")
@RequiredArgsConstructor
public class TeachingApi {


	private static final String CLASS_MEMBER_TEMPLATE = "template/学员导入模板.xlsx";

	private final TeachingService teachingService;

	private final ClassService classService;

	private final ClassResourceService classResourceService;


	private final AnswerService answerService;

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

	/** 某个班在某场考试里的答卷列表（答卷明细下钻） */
	@GetMapping("/classes/answers")
	@PreAuthorize("hasAuthority('project:report') or hasRole('admin')")
	public PaginationResponse<AnswerView> classAnswers(@RequestParam String projectId, @RequestParam String deptId,
			@RequestParam(defaultValue = "1") int current, @RequestParam(defaultValue = "20") int pageSize) {
		classService.assertVisible(deptId);
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setClassId(deptId);
		query.setCurrent(current);
		query.setPageSize(pageSize);

		return answerService.listAnswerByClass(query);
	}

	/** 未交卷名单：这个班在某场考试里还有谁没交（班级管理 → 答卷管理 / 查看数据） */
	@GetMapping("/classes/unsubmitted")
	@PreAuthorize("hasAuthority('class:detail') or hasRole('admin')")
	public UnsubmittedStudentView unsubmittedStudents(@RequestParam String projectId, @RequestParam String deptId) {
		return classService.listUnsubmittedStudents(projectId, deptId);
	}



	/** 当前用户能看到的班级树 */
	@GetMapping("/classes/tree")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public List<ClassNodeView> classTree(@RequestParam(required = false) String keyword) {
		return classService.listClassTree(keyword);
	}

	/** 新建班级 */
	@PostMapping("/classes/create")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public void createClass(@RequestBody DeptRequest request) {
		classService.createClass(request);
	}

	/** 修改班级（名称 / 上级 / 有效期） */
	@PostMapping("/classes/update")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public void updateClass(@RequestBody DeptRequest request) {
		classService.updateClass(request);
	}



	/** 某班已分配的资源面板 */
	@GetMapping("/classes/resources")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public List<ClassResourceView> classResources(@RequestParam String deptId,
			@RequestParam(required = false) String resourceType) {
		return classResourceService.list(deptId, resourceType);
	}








	/** 生成/读取班级 × 考试的专属公开链接 token；只有能管理该班的人可调用 */
	@PostMapping("/classes/resources/link")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public ClassShareLinkView classShareLink(@RequestBody ClassShareLinkRequest request) {
		String token = classResourceService.ensureShareToken(request.getClassId(), request.getResourceId());
		return new ClassShareLinkView(request.getClassId(), request.getResourceId(), token);
	}

	@PostMapping("/classes/resources/assign")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public void assignClassResource(@RequestBody ClassResourceAssignRequest request) {
		classResourceService.assign(request);
	}

	/** 修改一条分配：班级窗口与班级级开关 */
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

	/** 待审核学员：自己注册、账号尚未启用的学员 */
	@GetMapping("/classes/pending-students")
	@PreAuthorize("hasAuthority('class:detail') or hasRole('admin')")
	public List<ClassMemberView> pendingStudents() {
		return classService.listPendingStudents();
	}

	/** 审核通过：启用账号；body 里的 deptId 为空表示沿用注册时选的班级 */
	@PostMapping("/classes/pending-students/approve")
	@PreAuthorize("hasAuthority('class:member:approve') or hasRole('admin')")
	public void approvePendingStudent(@RequestBody PendingStudentApproveRequest request) {
		classService.approvePendingStudent(request);
	}


	/** 拒绝注册申请：删除待审核账号，手机号可重新注册；已审核通过的不能走这里 */
	@PostMapping("/classes/pending-students/reject")
	@PreAuthorize("hasAuthority('class:member:approve') or hasRole('admin')")
	public void rejectPendingStudent(@RequestBody PendingStudentApproveRequest request) {
		classService.rejectPendingStudent(request.getUserId());
	}

	/** 从其他班级添加学员时，源班候选名单（排除已在目标班的、待审核/停用的） */
	@GetMapping("/classes/member/candidates")
	@PreAuthorize("hasAuthority('class:member:assign') or hasRole('admin')")
	public List<ClassMemberView> memberCandidates(@RequestParam String targetDeptId,
			@RequestParam String sourceDeptId, @RequestParam(required = false) String keyword) {
		return classService.listMemberCandidates(targetDeptId, sourceDeptId, keyword);
	}

	/** 把已有学员批量加入当前班作为兼报班；逐条跳过超限/已在班里的 */
	@PostMapping("/classes/member/add-existing")
	@PreAuthorize("hasAuthority('class:member:assign') or hasRole('admin')")
	public AddExistingStudentsResult addExistingStudents(@RequestBody AddExistingStudentsRequest request) {
		return classService.addExistingStudents(request);
	}

	/** 调整学员班级归属：1 个主班 + 最多 2 个兼报班 */
	@PostMapping("/classes/member/assign")
	@PreAuthorize("hasAuthority('class:member:assign') or hasRole('admin')")
	public void assignStudentClasses(@RequestBody StudentClassAssignRequest request) {
		classService.assignStudentClasses(request);
	}

	/** 兼报班移出本班（不删账号）；主班不能走这里 */
	@PostMapping("/classes/member/remove-extra")
	@PreAuthorize("hasAuthority('class:member:assign') or hasRole('admin')")
	public void removeExtraClassMember(@RequestBody ClassMemberUpdateRequest request) {
		classService.removeExtraClassMember(request.getDeptId(), request.getId());
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

	/** 分配 / 重新分配老师 */
	@PostMapping("/classes/partner/create")
	@PreAuthorize("hasAuthority('class:grant') or hasRole('admin')")
	public void addClassPartners(@RequestBody ClassPartnerRequest request) {
		classService.addClassPartners(request);
	}

	/** 修改某条已授权老师的级别 */
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

	/** 班主任在自己可见的班里新增学员（角色固定为学员） */
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

	/** 班级学员批量导入（multipart/form-data：deptId + file） */
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
