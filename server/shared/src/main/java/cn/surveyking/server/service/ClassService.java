package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.ClassMemberCreateRequest;
import cn.surveyking.server.domain.dto.ClassMemberUpdateRequest;
import cn.surveyking.server.domain.dto.ClassMemberView;
import cn.surveyking.server.domain.dto.ClassNodeView;
import cn.surveyking.server.domain.dto.ClassPartnerRequest;
import cn.surveyking.server.domain.dto.ClassTeacherView;
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

	List<ClassMemberView> listClassMembers(String deptId);

	List<ClassTeacherView> listClassTeachers(String deptId);

	List<UserOptionView> listTeacherOptions(String keyword);

	void addClassPartners(ClassPartnerRequest request);

	void deleteClassPartner(ClassPartnerRequest request);

	void createClassMember(ClassMemberCreateRequest request);

	void updateClassMember(ClassMemberUpdateRequest request);

	void deleteClassMember(String deptId, String userId);

}
