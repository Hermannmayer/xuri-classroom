package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AddExistingStudentsRequest;
import cn.surveyking.server.domain.dto.AddExistingStudentsResult;
import cn.surveyking.server.domain.dto.ClassMemberCreateRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportResult;
import cn.surveyking.server.domain.dto.ClassMemberUpdateRequest;
import cn.surveyking.server.domain.dto.ClassMemberView;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.ClassPartnerRequest;
import cn.surveyking.server.domain.dto.ClassTeacherView;
import cn.surveyking.server.domain.dto.DeptRequest;
import cn.surveyking.server.domain.dto.PendingStudentApproveRequest;
import cn.surveyking.server.domain.dto.StudentClassAssignRequest;
import cn.surveyking.server.domain.dto.UnsubmittedStudentView;
import cn.surveyking.server.domain.dto.UserOptionView;

import java.util.List;

/**
 * 班级管理（老师视角）。
 *
 * <p>数据范围：班主任默认看自己创建/负责的班；管理员与持 {@code class:grant} 的人看全部；
 * 其余老师看被 {@code t_class_partner} 授权的班（授权一个班含下级班）。
 */
public interface ClassService {

	List<ClassNodeView> listClassTree(String keyword);

	/**
	 * 新建班级（dept_type=class，不绑角色）。老师有 class:list 即可建，create_by 由框架自动写入。
	 */
	void createClass(DeptRequest request);

	/**
	 * 修改班级（名称 / 上级 / 有效期）；类型固定为 class，不允许改。
	 */
	void updateClass(DeptRequest request);

	/**
	 * 当前用户能否管理这个班（写操作闸门）。
	 *
	 * <p>管理员 / class:grant / 班主任（create_by、manager_id）/ access_level=2 的授权可以通过；
	 * 其余抛 {@code AccessDeniedException("你对该班级只有查看权限，不能修改")}。
	 * 供班级资源分配等「不在 ClassService 内部」的写操作用接口方式调用，避免注入实现类。
	 */
	void assertManage(String deptId);

	/**
	 * 当前用户能否查看这个班（读操作闸门）。
	 *
	 * <p>管理员 / class:grant 放行；其余人要求本班或任一祖先班由自己创建、负责，或被授权。
	 * 供「按班查答卷」等不在 ClassService 内部的读操作用接口方式调用。
	 */
	void assertVisible(String deptId);

	/** 当前节点必须是教学班（class_kind=teaching），否则抛业务异常。 */
	void assertTeaching(String deptId);

	List<ClassMemberView> listClassMembers(String deptId);

	/**
	 * 未交卷名单：这个班还有谁没交某场考试。
	 *
	 * <p>「交没交」按答卷的 {@code create_by}（答题人账号）比对，不按 {@code t_answer.class_id}：
	 * class_id 记的是答题那一刻所在的班，学员换班、走别的班专属链接进来答题，答卷上的班级都不是当前班，
	 * 按班级过滤会把「其实已经交了」的人误报成未交；兼报班学员只交一份卷，按 class_id 也只会算到其中一个班。
	 *
	 * <p>读权限两道：{@link #assertVisible(String)}（这个班在不在你的可见范围）+ 项目可读
	 * （管理员 / 项目所有者 / 协作者）；两者都在实现里用服务层校验，注解只做粗筛。
	 * @param projectId 项目 id
	 * @param deptId 班级 id（dept_type=class 的教学班）
	 * @return total / submitted / 未交名单
	 */
	UnsubmittedStudentView listUnsubmittedStudents(String projectId, String deptId);

	List<ClassTeacherView> listClassTeachers(String deptId);

	List<UserOptionView> listTeacherOptions(String keyword);

	void addClassPartners(ClassPartnerRequest request);

	/** 修改某条班级授权的级别（1=只读 / 2=可管理） */
	void updateClassPartner(ClassPartnerRequest request);

	void deleteClassPartner(ClassPartnerRequest request);

	void createClassMember(ClassMemberCreateRequest request);

	void updateClassMember(ClassMemberUpdateRequest request);

	void deleteClassMember(String deptId, String userId);

	/** 把学员从兼报班移出（不删账号）；主班不能走这个接口。 */
	void removeExtraClassMember(String deptId, String userId);

	/** 从其他班级挑选已有学员时，源班的候选名单（排除已在目标班的）。 */
	List<ClassMemberView> listMemberCandidates(String targetDeptId, String sourceDeptId, String keyword);

	/** 把已有学员批量加入当前班作为兼报班；逐条跳过超限/已在班里的。 */
	AddExistingStudentsResult addExistingStudents(AddExistingStudentsRequest request);

	/** 调整学员班级归属：1 个主班 + 最多 2 个兼报班。 */
	void assignStudentClasses(StudentClassAssignRequest request);

	/**
	 * 待审核学员：自己注册、账号尚未启用的学员。
	 *
	 * <p>只返回当前用户可见班级里的学员；管理员 / class:grant 看全部。
	 * 注册时学员已经选过班级，所以这里按主组（t_user.dept_id）就能定位。
	 */
	List<ClassMemberView> listPendingStudents();

	/** 审核通过：启用账号；deptId 为空表示沿用注册时选的班级。 */
	void approvePendingStudent(PendingStudentApproveRequest request);

	/** 拒绝注册申请：删除待审核账号（手机号可重新注册）；已审核通过的不能走这里。 */
	void rejectPendingStudent(String userId);

	/** 批量导入学员（Excel）；整批事务，任一行失败全部回滚 */
	ClassMemberImportResult importClassMembers(ClassMemberImportRequest request);

}
