package cn.surveyking.server.impl;

import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * 答卷访问控制：本人可看、项目所有者/协作者可看全部、管理员全量。
 *
 * <p>
 * 从 {@code AnswerServiceImpl} 切出的第一块。授权判断被列表、详情、修改、删除四条路径共用，
 * 抽出来之后这些方法不必再依赖 {@code ServiceImpl.getBaseMapper()}。
 */
@Component
@RequiredArgsConstructor
public class AnswerAccessGuard {

	private final AnswerMapper answerMapper;

	private final ProjectPartnerMapper projectPartnerMapper;

	private final UserDeptScopeService userDeptScopeService;

	public void assertAnswerAccess(Answer answer) {
		if (answer == null) {
			throw new AccessDeniedException("无权限访问该答案");
		}
		// 本人答卷：学员看自己的成绩/解析不需要项目协作者身份
		if (Objects.equals(answer.getCreateBy(), SecurityContextUtils.getUserId())) {
			return;
		}
		assertProjectAccess(answer.getProjectId());
	}


	public void assertAnswersAccess(List<String> answerIds) {
		if (CollectionUtils.isEmpty(answerIds)) {
			return;
		}
		List<String> projectIds = answerMapper.selectProjectIdsByIds(answerIds);
		if (projectIds.size() == 0) {
			throw new AccessDeniedException("无权限访问该答案");
		}
		projectIds.forEach(this::assertProjectAccess);
	}


	public void assertProjectAccess(String projectId) {
		if (!canManageProject(projectId)) {
			throw new AccessDeniedException("无权限访问该问卷答案");
		}
	}


	/**
	 * 当前用户能否看到某个项目的全部答卷。
	 *
	 * <p>管理员全量；项目所有者/协作者（含按用户组授权）可看；学员作为答卷人只能看自己的，
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

}
