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







public interface ClassService {

	List<ClassNodeView> listClassTree(String keyword);

	/** 新建班级（dept_type=class，不绑角色） */
	void createClass(DeptRequest request);

	/** 修改班级（名称 / 上级 / 有效期）；类型固定为 class，不允许改 */
	void updateClass(DeptRequest request);

	/** 当前用户能否管理这个班（写操作闸门） */
	void assertManage(String deptId);

	/** 当前用户能否查看这个班（读操作闸门） */
	void assertVisible(String deptId);


	void assertTeaching(String deptId);

	List<ClassMemberView> listClassMembers(String deptId);

	/** 未交卷名单：这个班还有谁没交某场考试；返回 total / submitted / 未交名单。 */
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

	/** 把学员从兼报班移出（不删账号）；主班不能走这个接口 */
	void removeExtraClassMember(String deptId, String userId);

	/** 从其他班级挑选已有学员时，源班的候选名单（排除已在目标班的） */
	List<ClassMemberView> listMemberCandidates(String targetDeptId, String sourceDeptId, String keyword);

	/** 把已有学员批量加入当前班作为兼报班；逐条跳过超限/已在班里的 */
	AddExistingStudentsResult addExistingStudents(AddExistingStudentsRequest request);

	/** 调整学员班级归属：1 个主班 + 最多 2 个兼报班 */
	void assignStudentClasses(StudentClassAssignRequest request);

	/** 待审核学员：自己注册、账号尚未启用的学员 */
	List<ClassMemberView> listPendingStudents();

	/** 审核通过：启用账号；deptId 为空表示沿用注册时选的班级 */
	void approvePendingStudent(PendingStudentApproveRequest request);

	/** 拒绝注册申请：删除待审核账号（手机号可重新注册）；已审核通过的不能走这里 */
	void rejectPendingStudent(String userId);

	/** 批量导入学员（Excel）；整批事务，任一行失败全部回滚 */
	ClassMemberImportResult importClassMembers(ClassMemberImportRequest request);

}
