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

/**
 * 答卷访问控制。
 *
 * <p>
 * 三条口径，按「能看到多少」从大到小：
 * <ol>
 * <li><b>项目级</b>：管理员、项目所有者、协作者（含按用户组授权）——能看这场考试的全部答卷；</li>
 * <li><b>班级级</b>：老师带了这个班，且这场考试被分配给了该班（{@code t_class_resource}）——只能看<b>这个班</b>的答卷；</li>
 * <li><b>本人</b>：学员看自己的成绩与解析，不需要任何项目/班级身份。</li>
 * </ol>
 *
 * <p>
 * 为什么要有第二条：老师把考试分配给自己的班之后，在「教学 → 班级 → 查看答卷」里能看到入口，
 * 但项目协作者表里并没有他——只认项目协作者会导致「有入口、点进去 403」。
 * 反过来也不能因为一个班的分配就放开整场：所以读全部的地方（列表 / 导出 / 批改）都要带上班级范围。
 */
@Component
@RequiredArgsConstructor
public class AnswerAccessGuard {

	/** {@code t_class_resource.resource_type} 里「考试/问卷」的取值，与 ClassResourceService 保持一致 */
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
		// 本人答卷：学员看自己的成绩/解析不需要项目协作者身份
		if (Objects.equals(answer.getCreateBy(), SecurityContextUtils.getUserId())) {
			return;
		}
		if (canManageProject(answer.getProjectId())) {
			return;
		}
		// 班级级：只能看自己带的那几个班的答卷，不能顺着 projectId 看别的班
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
		// 只取判断需要的列：答案正文可能有几百 KB，权限判定用不到
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

	/**
	 * 当前用户能否看到某个项目的全部答卷（项目级口径，不含班级级）。
	 *
	 * <p>
	 * 管理员全量；项目所有者/协作者（含按用户组授权）可看；学员作为答卷人只能看自己的，
	 * 由 {@link #listAnswer} 的 createBy 条件兜住。
	 */
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

	/**
	 * 当前用户在这个项目上「因班级分配」可读的班级 id：
	 * 项目被分配给某个班（t_class_resource）且这个班对当前用户可见（自己创建/负责、被授权、或 class:grant）。
	 *
	 * <p>
	 * 只做读判断，不返回 null：调用方直接当集合用，空集表示没有班级级权限。
	 */
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
			// SQL 里已经有 in(class_id, visible)，这里再兜一次：Mapper 被 mock、或以后有人改坏了条件，
			// 也不至于把「不可见的班」当成可读范围
			if (StringUtils.hasText(resource.getClassId()) && visibleClassIds.contains(resource.getClassId())) {
				ids.add(resource.getClassId());
			}
		}
		return ids;
	}

	/**
	 * 当前用户可见的班级 id（含下级班）。
	 *
	 * <p>
	 * 与 {@code ClassServiceImpl#visibleDeptIds} 同一套口径：管理员与 class:grant 看全部；
	 * 其余人 = 自己创建/负责的班 + 被授权的班，再向下展开。这里直接查 Mapper 而不是注入 ClassService，
	 * 是因为 ClassServiceImpl 依赖本类（未交名单），反向依赖会成环。
	 */
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
		// 防御：roots 里可能有已删除/不属于 class 的 id，过滤一次，避免 IN 里带脏值
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