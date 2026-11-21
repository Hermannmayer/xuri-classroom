package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.ClassPartner;
import cn.surveyking.server.domain.model.ClassResource;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ClassPartnerMapper;
import cn.surveyking.server.mapper.ClassResourceMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

















@Component
@RequiredArgsConstructor
public class AnswerAccessGuard {


	private static final String RESOURCE_TYPE_PROJECT = "project";

	private final AnswerMapper answerMapper;

	private final ProjectPartnerMapper projectPartnerMapper;

	private final UserDeptScopeService userDeptScopeService;

	private final DeptMapper deptMapper;

	private final ClassPartnerMapper classPartnerMapper;

	private final ClassResourceMapper classResourceMapper;

	public void assertAnswerAccess(Answer answer) {
		if (answer == null) {
			throw new AccessDeniedException("无权限访问该答案");
		}

		if (Objects.equals(answer.getCreateBy(), SecurityContextUtils.getUserId())) {
			return;
		}
		if (canManageProject(answer.getProjectId())) {
			return;
		}

		if (StringUtils.hasText(answer.getClassId())
				&& readableClassIds(answer.getProjectId()).contains(answer.getClassId())) {
			return;
		}
		throw new AccessDeniedException("无权限访问该答案");
	}

	public void assertAnswersAccess(List<String> answerIds) {
		if (CollectionUtils.isEmpty(answerIds)) {
			return;
		}

		List<Answer> answers = answerMapper.selectList(Wrappers.<Answer>lambdaQuery()
				.select(Answer::getId, Answer::getProjectId, Answer::getClassId, Answer::getCreateBy)
				.in(Answer::getId, answerIds));
		if (answers.isEmpty()) {
			throw new AccessDeniedException("无权限访问该答案");
		}
		for (Answer answer : answers) {
			assertAnswerAccess(answer);
		}
	}

	public void assertProjectAccess(String projectId) {
		if (!canReadProject(projectId)) {
			throw new AccessDeniedException("无权限访问该问卷答案");
		}
	}

	/** 当前用户能否看到某个项目的全部答卷（项目级口径，不含班级级） */
	public boolean canManageProject(String projectId) {
		if (SecurityContextUtils.isAdmin()) {
			return true;
		}
		if (!StringUtils.hasText(projectId)) {
			return false;
		}
		Set<String> deptScope = userDeptScopeService.resolveDeptScope(SecurityContextUtils.getUserId());
		return projectPartnerMapper.selectCount(Wrappers.<ProjectPartner>lambdaQuery()
				.eq(ProjectPartner::getProjectId, projectId)
				.in(ProjectPartner::getType,
						Arrays.asList(ProjectPartnerTypeEnum.OWNER.getType(),
								ProjectPartnerTypeEnum.COLLABORATOR.getType()))
				.and(w -> {
					w.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId());
					if (!deptScope.isEmpty()) {
						w.or().in(ProjectPartner::getGroupId, deptScope);
					}
				})) > 0;
	}

	/** 读口径：项目级 + 班级级（只要有一场考试分配给自己带的班，就能进来，具体范围由列表/导出再收窄） */
	public boolean canReadProject(String projectId) {
		return canManageProject(projectId) || !readableClassIds(projectId).isEmpty();
	}

	/** 当前用户在这个项目上「因班级分配」可读的班级 id： 项目被分配给某个班（t_class_resource）且这个班对当前用户可见（自己创建/负责、被授权、或 class:grant） */
	public Set<String> readableClassIds(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			return Collections.emptySet();
		}
		Set<String> visibleClassIds = visibleClassIds();
		if (visibleClassIds.isEmpty()) {
			return Collections.emptySet();
		}
		List<ClassResource> resources = classResourceMapper.selectList(Wrappers.<ClassResource>lambdaQuery()
				.eq(ClassResource::getResourceId, projectId)
				.eq(ClassResource::getResourceType, RESOURCE_TYPE_PROJECT)
				.in(ClassResource::getClassId, visibleClassIds));
		Set<String> ids = new LinkedHashSet<>();
		for (ClassResource resource : resources) {


			if (StringUtils.hasText(resource.getClassId()) && visibleClassIds.contains(resource.getClassId())) {
				ids.add(resource.getClassId());
			}
		}
		return ids;
	}

	/** 当前用户可见的班级 id（含下级班） */
	private Set<String> visibleClassIds() {
		List<Dept> classes = deptMapper
				.selectList(Wrappers.<Dept>lambdaQuery().eq(Dept::getDeptType, Dept.TYPE_CLASS));
		if (classes.isEmpty()) {
			return Collections.emptySet();
		}
		if (SecurityContextUtils.isAdmin()
				|| SecurityContextUtils.hasAuthority(PermissionEnum.CLASS_GRANT.getCode())) {
			Set<String> all = new LinkedHashSet<>();
			for (Dept dept : classes) {
				if (StringUtils.hasText(dept.getId())) {
					all.add(dept.getId());
				}
			}
			return all;
		}
		String userId = SecurityContextUtils.getUserId();
		if (!StringUtils.hasText(userId)) {
			return Collections.emptySet();
		}
		Set<String> roots = new LinkedHashSet<>();
		for (Dept dept : classes) {
			if (Objects.equals(userId, dept.getCreateBy()) || Objects.equals(userId, dept.getManagerId())) {
				roots.add(dept.getId());
			}
		}
		classPartnerMapper.selectList(Wrappers.<ClassPartner>lambdaQuery().eq(ClassPartner::getUserId, userId))
				.forEach(partner -> {
					if (StringUtils.hasText(partner.getDeptId())) {
						roots.add(partner.getDeptId());
					}
				});
		if (roots.isEmpty()) {
			return Collections.emptySet();
		}
		return expandDescendants(roots, classes);
	}

	/** 从 roots 出发，把子班也算进来（资源可能分配在下级班） */
	private Set<String> expandDescendants(Set<String> roots, List<Dept> classes) {
		Set<String> result = new LinkedHashSet<>(roots);
		Deque<String> queue = new ArrayDeque<>(roots);
		while (!queue.isEmpty()) {
			String parent = queue.poll();
			for (Dept dept : classes) {
				if (parent.equals(dept.getParentId()) && StringUtils.hasText(dept.getId())
						&& result.add(dept.getId())) {
					queue.add(dept.getId());
				}
			}
		}

		List<String> known = new ArrayList<>();
		for (Dept dept : classes) {
			if (StringUtils.hasText(dept.getId())) {
				known.add(dept.getId());
			}
		}
		result.retainAll(known);
		return result;
	}

}