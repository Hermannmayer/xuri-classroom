package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.RepoPartnerQuery;
import cn.surveyking.server.domain.dto.RepoPartnerRequest;
import cn.surveyking.server.domain.dto.RepoPartnerView;
import cn.surveyking.server.domain.mapper.RepoPartnerViewMapper;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Repo;
import cn.surveyking.server.domain.model.RepoPartner;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.RepoMapper;
import cn.surveyking.server.mapper.RepoPartnerMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.ClassResourceService;
import cn.surveyking.server.service.RepoPartnerService;
import cn.surveyking.server.service.UserDeptScopeService;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.validation.ValidationException;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class RepoPartnerServiceImpl extends BaseService<RepoPartnerMapper, RepoPartner> implements RepoPartnerService {

	private final UserServiceImpl userService;

	private final RepoMapper repoMapper;

	private final RepoPartnerViewMapper repoPartnerViewMapper;

	private final cn.surveyking.server.mapper.DeptMapper deptMapper;

	private final UserMapper userMapper;

	private final UserDeptScopeService userDeptScopeService;


	private final ClassResourceService classResourceService;


	private static final int ACCESS_LEVEL_VIEW = 1;


	private static final int ACCESS_LEVEL_EDIT = 2;


	private static final int ACCESS_LEVEL_GRANT = 3;

	@Override
	public PaginationResponse<RepoPartnerView> listRepoPartner(RepoPartnerQuery query) {
		assertManagePermission(query.getRepoId());
		Page<RepoPartner> page = pageByQuery(query, Wrappers.<RepoPartner>lambdaQuery()
				.eq(RepoPartner::getRepoId, query.getRepoId())
				.apply(StringUtils.hasText(query.getUserName()),
						"EXISTS (SELECT 1 FROM t_user WHERE t_user.id = t_repo_partner.user_id AND t_user.name = {0})",
						query.getUserName())

				.and(w -> w.isNull(RepoPartner::getUserId).or().apply(
						"EXISTS (SELECT 1 FROM t_user u WHERE u.id = t_repo_partner.user_id AND u.user_type = 'staff')"))
				.and(w -> w.isNull(RepoPartner::getDeptId).or().apply(
						"EXISTS (SELECT 1 FROM t_dept d WHERE d.id = t_repo_partner.dept_id AND d.dept_type = 'org')"))
				.orderByAsc(RepoPartner::getCreateAt));
		PaginationResponse<RepoPartnerView> result = new PaginationResponse<>(page.getTotal(),
				repoPartnerViewMapper.toView(page.getRecords()));
		result.getList().forEach(view -> {
			if (view.getUserId() != null) {
				view.setUser(userService.loadUserById(view.getUserId()));
				User user = userMapper.selectById(view.getUserId());
				if (user != null) {
					view.setUserType(user.getUserType());
				}
			}

			if (StringUtils.hasText(view.getDeptId())) {
				Dept dept = deptMapper.selectById(view.getDeptId());
				if (dept != null) {
					view.setDeptName(dept.getName());
					view.setDeptType(dept.getDeptType());
				}
			}
		});
		return result;
	}

	@Override
	public void addRepoPartner(RepoPartnerRequest request) {
		assertManagePermission(request.getRepoId());
		int level = normalizeAccessLevel(request.getAccessLevel());

		if (StringUtils.hasText(request.getDeptId())) {
			Dept dept = deptMapper.selectById(request.getDeptId());
			if (dept == null || !Dept.TYPE_ORG.equals(dept.getDeptType())) {
				throw new ValidationException("题库只能授权给教师用户组；学员请到班级管理 → 班级资源里分配题库");
			}
			RepoPartner exist = getOne(Wrappers.<RepoPartner>lambdaQuery()
					.eq(RepoPartner::getRepoId, request.getRepoId()).eq(RepoPartner::getDeptId, request.getDeptId()),
					false);
			if (exist == null) {
				RepoPartner partner = new RepoPartner();
				partner.setRepoId(request.getRepoId());
				partner.setDeptId(request.getDeptId());
				partner.setAccessLevel(level);
				save(partner);
			}
			else if (!Objects.equals(exist.getAccessLevel(), level)) {

				RepoPartner update = new RepoPartner();
				update.setId(exist.getId());
				update.setAccessLevel(level);
				updateById(update);
			}
			return;
		}
		if (CollectionUtils.isEmpty(request.getUserIds())) {
			return;
		}
		List<User> targetUsers = userMapper.selectBatchIds(request.getUserIds());
		if (targetUsers.size() != request.getUserIds().stream().filter(StringUtils::hasText).distinct().count()
				|| targetUsers.stream().anyMatch(user -> user == null || !"staff".equals(user.getUserType()))) {
			throw new ValidationException("题库只能授权给教职工；学员请到班级管理 → 班级资源里分配题库");
		}
		List<RepoPartner> existPartners = list(Wrappers.<RepoPartner>lambdaQuery()
				.eq(RepoPartner::getRepoId, request.getRepoId()).in(RepoPartner::getUserId, request.getUserIds()));
		List<RepoPartner> partners = request.getUserIds().stream().filter(
				userId -> existPartners.stream().noneMatch(partner -> Objects.equals(partner.getUserId(), userId)))
				.map(userId -> {
					RepoPartner partner = new RepoPartner();
					partner.setRepoId(request.getRepoId());
					partner.setUserId(userId);
					partner.setAccessLevel(level);
					return partner;
				}).collect(Collectors.toList());
		if (!partners.isEmpty()) {
			saveBatch(partners);
		}

		List<RepoPartner> levelUpdates = existPartners.stream()
				.filter(partner -> partner.getUserId() != null && !Objects.equals(partner.getAccessLevel(), level))
				.map(partner -> {
					RepoPartner update = new RepoPartner();
					update.setId(partner.getId());
					update.setAccessLevel(level);
					return update;
				}).collect(Collectors.toList());
		if (!levelUpdates.isEmpty()) {
			updateBatchById(levelUpdates);
		}
	}

	@Override
	public void deleteRepoPartner(RepoPartnerRequest request) {
		assertManagePermission(request.getRepoId());
		remove(Wrappers.<RepoPartner>lambdaUpdate().eq(RepoPartner::getRepoId, request.getRepoId())
				.in(CollectionUtils.isNotEmpty(request.getIds()), RepoPartner::getId, request.getIds())
				.in(CollectionUtils.isNotEmpty(request.getUserIds()), RepoPartner::getUserId, request.getUserIds()));
	}

	@Override
	public void updateRepoPartner(RepoPartnerRequest request) {
		if (!StringUtils.hasText(request.getId())) {
			throw new ValidationException("未指定要修改的成员");
		}
		RepoPartner partner = getById(request.getId());
		if (partner == null) {
			throw new ValidationException("成员不存在，请刷新后重试");
		}
		if (StringUtils.hasText(request.getRepoId()) && !Objects.equals(request.getRepoId(), partner.getRepoId())) {
			throw new AccessDeniedException("不能跨题库修改成员");
		}
		assertManagePermission(partner.getRepoId());
		if (request.getAccessLevel() == null) {
			throw new ValidationException("请选择授权级别");
		}
		RepoPartner update = new RepoPartner();
		update.setId(partner.getId());
		update.setAccessLevel(normalizeAccessLevel(request.getAccessLevel()));
		updateById(update);
	}

	@Override
	public boolean hasPracticePermission(String repoId, String userId) {
		if (!StringUtils.hasText(repoId) || !StringUtils.hasText(userId)) {
			return false;
		}
		Repo repo = repoMapper.selectById(repoId);
		if (repo == null) {
			return false;
		}
		User user = userMapper.selectById(userId);
		if (user == null) {
			return false;
		}

		if ("student".equals(user.getUserType())) {
			return classResourceService.canStudentReadRepo(repoId);
		}
		if (Objects.equals(repo.getCreateBy(), userId)) {
			return true;
		}
		if (classResourceService.canStudentReadRepo(repoId)) {
			return true;
		}

		Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		return count(Wrappers.<RepoPartner>lambdaQuery().eq(RepoPartner::getRepoId, repoId).and(w -> {
			w.eq(RepoPartner::getUserId, userId);
			if (!deptScope.isEmpty()) {
				w.or(q -> q.isNotNull(RepoPartner::getDeptId).in(RepoPartner::getDeptId, deptScope));
			}
		})) > 0;
	}

	private void assertManagePermission(String repoId) {
		Repo repo = repoMapper.selectById(repoId);
		if (repo == null) {
			throw new AccessDeniedException("无权限管理该题库成员");
		}

		if (SecurityContextUtils.isAdmin() || Objects.equals(repo.getCreateBy(), SecurityContextUtils.getUserId())) {
			return;
		}

		String userId = SecurityContextUtils.getUserId();
		Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		long grantor = count(Wrappers.<RepoPartner>lambdaQuery().eq(RepoPartner::getRepoId, repoId)
				.ge(RepoPartner::getAccessLevel, ACCESS_LEVEL_GRANT).and(w -> {
					w.eq(RepoPartner::getUserId, userId);
					if (!deptScope.isEmpty()) {
						w.or().isNotNull(RepoPartner::getDeptId).in(RepoPartner::getDeptId, deptScope);
					}
				}));
		if (grantor == 0) {
			throw new AccessDeniedException("无权限管理该题库成员");
		}
	}

	/** 授权级别：为空按「可编辑」，越界夹到 1~3 */
	private int normalizeAccessLevel(Integer accessLevel) {
		if (accessLevel == null) {
			return ACCESS_LEVEL_EDIT;
		}
		if (accessLevel < ACCESS_LEVEL_VIEW) {
			return ACCESS_LEVEL_VIEW;
		}
		if (accessLevel > ACCESS_LEVEL_GRANT) {
			return ACCESS_LEVEL_GRANT;
		}
		return accessLevel;
	}

}
