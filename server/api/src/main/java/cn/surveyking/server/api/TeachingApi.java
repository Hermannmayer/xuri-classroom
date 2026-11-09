package cn.surveyking.server.api;

import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ClassMemberCreateRequest;
import cn.surveyking.server.domain.dto.ClassMemberUpdateRequest;
import cn.surveyking.server.domain.dto.ClassMemberView;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.ClassPartnerRequest;
import cn.surveyking.server.domain.dto.ClassTeacherView;
import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;
import cn.surveyking.server.domain.dto.UserOptionView;
import cn.surveyking.server.service.ClassService;
import cn.surveyking.server.service.TeachingService;
import lombok.RequiredArgsConstructor;
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
 */
@RestController
@RequestMapping("${api.prefix}/teaching")
@RequiredArgsConstructor
public class TeachingApi {

	private final TeachingService teachingService;

	private final ClassService classService;

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

	/* ---------------------------------------------------------------- 班级管理 */

	/**
	 * 当前用户能看到的班级树。
	 *
	 * <p>班主任看自己创建/负责的班，老师看被授权的班，管理员与 class:grant 看全部；
	 * 被授权的班会自动补上祖先节点，保证树有路径可显示。
	 */
	@GetMapping("/classes/tree")
	@PreAuthorize("hasAuthority('class:list') or hasRole('admin')")
	public List<ClassNodeView> classTree(@RequestParam(required = false) String keyword) {
		return classService.listClassTree(keyword);
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

	@PostMapping("/classes/partner/create")
	@PreAuthorize("hasAuthority('class:grant') or hasRole('admin')")
	public void addClassPartners(@RequestBody ClassPartnerRequest request) {
		classService.addClassPartners(request);
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

}
