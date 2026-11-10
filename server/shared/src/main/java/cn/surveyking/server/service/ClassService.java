package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.ClassMemberCreateRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportRequest;
import cn.surveyking.server.domain.dto.ClassMemberImportResult;
import cn.surveyking.server.domain.dto.ClassMemberUpdateRequest;
import cn.surveyking.server.domain.dto.ClassMemberView;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.ClassPartnerRequest;
import cn.surveyking.server.domain.dto.ClassTeacherView;
import cn.surveyking.server.domain.dto.DeptRequest;
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

	List<ClassMemberView> listClassMembers(String deptId);

	List<ClassTeacherView> listClassTeachers(String deptId);

	List<UserOptionView> listTeacherOptions(String keyword);

	void addClassPartners(ClassPartnerRequest request);

	/** 修改某条班级授权的级别（1=只读 / 2=可管理） */
	void updateClassPartner(ClassPartnerRequest request);

	void deleteClassPartner(ClassPartnerRequest request);

	void createClassMember(ClassMemberCreateRequest request);

	void updateClassMember(ClassMemberUpdateRequest request);

	void deleteClassMember(String deptId, String userId);

	/** 批量导入学员（Excel）；整批事务，任一行失败全部回滚 */
	ClassMemberImportResult importClassMembers(ClassMemberImportRequest request);

}
