package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.ExcelImportSecurity;
import cn.surveyking.server.core.uitls.ExcelExporter;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.ProjectPartnerQuery;
import cn.surveyking.server.domain.dto.ProjectPartnerRequest;
import cn.surveyking.server.domain.dto.ProjectPartnerView;
import cn.surveyking.server.domain.dto.WhiteListRequest;
import cn.surveyking.server.domain.mapper.ProjectPartnerViewMapper;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.ProjectPartnerMapper;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.UserDeptScopeService;
import cn.surveyking.server.service.UserService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.CollectionUtils;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import jakarta.validation.ValidationException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.commons.lang3.StringUtils.isBlank;





@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class ProjectPartnerServiceImpl extends BaseService<ProjectPartnerMapper, ProjectPartner>
		implements ProjectPartnerService {

	private final UserServiceImpl userService;

	private final UserDeptScopeService userDeptScopeService;

	private final CacheManager cacheManager;

	private final ProjectPartnerViewMapper projectPartnerViewMapper;


	private final AnswerAccessGuard answerAccessGuard;


	private final ProjectMapper projectMapper;


	private static final int MAX_FOLDER_DEPTH = 32;


	private static final int ACCESS_LEVEL_VIEW = 1;


	private static final int ACCESS_LEVEL_EDIT = 2;


	private static final int ACCESS_LEVEL_GRANT = 3;

	@Override
	public PaginationResponse<ProjectPartnerView> listProjectPartner(ProjectPartnerQuery query) {
		Page<ProjectPartner> page = pageByQuery(query,
				Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, query.getProjectId())
						.in(query.getTypes() != null, ProjectPartner::getType, query.getTypes())
						.eq(query.getStatus() != null, ProjectPartner::getStatus, query.getStatus()).like(
								query.getUserName() != null
										&& query.getTypes() != null
										&& query.getTypes()
												.contains(ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType()),
								ProjectPartner::getUserName, query.getUserName())
						.apply(query.getUserName() != null,
								"EXISTS (SELECT 1 FROM t_user WHERE t_user.name = {0} AND t_user.id = t_project_partner.user_id)",
								query.getUserName())
						.orderByAsc(ProjectPartner::getCreateAt));
		PaginationResponse<ProjectPartnerView> result = new PaginationResponse<>(page.getTotal(),
				projectPartnerViewMapper.toView(page.getRecords()));
		for (ProjectPartnerView view : result.getList()) {
			if (view.getUserId() != null) {
				view.setUser(userService.loadUserById(view.getUserId()));

				if (view.getUser() != null && org.apache.commons.lang3.StringUtils.isNotBlank(view.getUser().getName())) {
					view.setUserName(view.getUser().getName());
				}
			}
		}
		return result;
	}

	@Override
	public void addProjectPartner(ProjectPartnerRequest request) {
		int type = request.getType() == null ? ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType()
				: request.getType();
		long ownerCount = count(Wrappers.<ProjectPartner>lambdaQuery()
				.eq(ProjectPartner::getProjectId, request.getProjectId())
				.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.OWNER.getType()));
		if (type == ProjectPartnerTypeEnum.OWNER.getType() && ownerCount > 0) {
			throw new AccessDeniedException("请使用专用的所有权转移功能");
		}


		if (!(type == ProjectPartnerTypeEnum.OWNER.getType() && ownerCount == 0)) {
			assertCanGrant(request.getProjectId());
		}


		if (org.apache.commons.lang3.StringUtils.isNotBlank(request.getGroupId())) {
			int level = type == ProjectPartnerTypeEnum.COLLABORATOR.getType()
					? normalizeAccessLevel(request.getAccessLevel()) : ACCESS_LEVEL_VIEW;
			ProjectPartner exist = getOne(Wrappers.<ProjectPartner>lambdaQuery()
					.eq(ProjectPartner::getProjectId, request.getProjectId())
					.eq(ProjectPartner::getGroupId, request.getGroupId()).eq(ProjectPartner::getType, type), false);
			if (exist == null) {
				ProjectPartner partner = new ProjectPartner();
				partner.setProjectId(request.getProjectId());
				partner.setGroupId(request.getGroupId());
				partner.setType(type);
				partner.setAccessLevel(level);
				save(partner);
			}
			else if (type == ProjectPartnerTypeEnum.COLLABORATOR.getType()
					&& !Objects.equals(exist.getAccessLevel(), level)) {

				ProjectPartner update = new ProjectPartner();
				update.setId(exist.getId());
				update.setAccessLevel(level);
				updateById(update);
			}

			evictAllProjectPermissions();
			return;
		}

		int level = type == ProjectPartnerTypeEnum.OWNER.getType() ? ACCESS_LEVEL_GRANT
				: type == ProjectPartnerTypeEnum.COLLABORATOR.getType()
						? normalizeAccessLevel(request.getAccessLevel()) : ACCESS_LEVEL_VIEW;
		List<ProjectPartner> existUserIds = list(Wrappers.<ProjectPartner>lambdaQuery()
				.in(request.getUserIds() != null, ProjectPartner::getUserId, request.getUserIds())
				.in(request.getUserNames() != null
						&& ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == type,
						ProjectPartner::getUserName, request.getUserNames())
				.eq(ProjectPartner::getType, type)
				.eq(ProjectPartner::getProjectId, request.getProjectId()));
		if (ProjectPartnerTypeEnum.RESPONDENT_IMP_USER.getType() == type) {
			saveBatch(request.getUserNames().stream().filter(username -> {
				if (existUserIds.stream().anyMatch(partner -> partner.getUserName().equals(username))) {
					return false;
				}
				return true;
			}).map(userName -> {
				ProjectPartner partner = new ProjectPartner();
				partner.setProjectId(request.getProjectId());
				partner.setUserName(userName);
				partner.setType(type);
				partner.setAccessLevel(ACCESS_LEVEL_VIEW);
				return partner;
			}).collect(Collectors.toList()));
			return;
		}
		List<ProjectPartner> newPartners = request.getUserIds().stream().filter(userId -> {
			if (existUserIds.stream().anyMatch(partner -> partner.getUserId().equals(userId))) {
				return false;
			}
			return true;
		}).map(userId -> {
			ProjectPartner partner = new ProjectPartner();
			partner.setProjectId(request.getProjectId());
			partner.setUserId(userId);
			partner.setType(type);
			partner.setAccessLevel(level);
			return partner;
		}).collect(Collectors.toList());
		if (!newPartners.isEmpty()) {
			saveBatch(newPartners);
		}

		if (type == ProjectPartnerTypeEnum.COLLABORATOR.getType()) {
			List<ProjectPartner> levelUpdates = existUserIds.stream()
					.filter(partner -> partner.getUserId() != null
							&& !Objects.equals(partner.getAccessLevel(), level))
					.map(partner -> {
						ProjectPartner update = new ProjectPartner();
						update.setId(partner.getId());
						update.setAccessLevel(level);
						return update;
					}).collect(Collectors.toList());
			if (!levelUpdates.isEmpty()) {
				updateBatchById(levelUpdates);
			}
		}

		evictProjectPermissionsForUsers(request.getUserIds());
	}

	@Override
	public void deleteProjectPartner(ProjectPartnerRequest request) {
		if (CollectionUtils.isEmpty(request.getIds()) && CollectionUtils.isEmpty(request.getProjectIds())
				&& request.getProjectId() == null) {
			throw new AccessDeniedException("未指定要删除的项目成员");
		}

		if (!isBlank(request.getProjectId())) {
			assertCanGrant(request.getProjectId());
		}
		List<ProjectPartner> partners = list(Wrappers.<ProjectPartner>lambdaQuery()
				.in(CollectionUtils.isNotEmpty(request.getIds()), ProjectPartner::getId, request.getIds())
				.in(CollectionUtils.isNotEmpty(request.getProjectIds()), ProjectPartner::getProjectId,
						request.getProjectIds())
				.eq(request.getProjectId() != null, ProjectPartner::getProjectId, request.getProjectId()));

		partners.stream().map(ProjectPartner::getProjectId).filter(Objects::nonNull).distinct()
				.filter(projectId -> !Objects.equals(projectId, request.getProjectId())).forEach(this::assertCanGrant);
		if (partners.stream()
				.anyMatch(partner -> Objects.equals(partner.getType(), ProjectPartnerTypeEnum.OWNER.getType()))) {
			throw new AccessDeniedException("不能通过成员删除接口删除项目所有者");
		}
		if (!partners.isEmpty()) {
			removeByIds(partners.stream().map(ProjectPartner::getId).collect(Collectors.toList()));
		}
		evictProjectPermissions(partners);
	}

	@Override
	public void updateProjectPartner(ProjectPartnerRequest request) {
		if (isBlank(request.getId())) {
			throw new ValidationException("未指定要修改的成员");
		}
		ProjectPartner partner = getById(request.getId());
		if (partner == null) {
			throw new ValidationException("成员不存在，请刷新后重试");
		}
		if (request.getProjectId() != null && !Objects.equals(request.getProjectId(), partner.getProjectId())) {
			throw new AccessDeniedException("不能跨项目修改成员");
		}
		assertCanGrant(partner.getProjectId());
		if (!Objects.equals(partner.getType(), ProjectPartnerTypeEnum.COLLABORATOR.getType())) {

			throw new ValidationException("只有协作者可以调整授权级别");
		}
		if (request.getAccessLevel() == null) {
			throw new ValidationException("请选择授权级别");
		}
		ProjectPartner update = new ProjectPartner();
		update.setId(partner.getId());
		update.setAccessLevel(normalizeAccessLevel(request.getAccessLevel()));
		updateById(update);
		evictProjectPermissions(Collections.singletonList(partner));
	}

	@Override
	public void deleteAllProjectPartners(List<String> projectIds) {
		if (CollectionUtils.isEmpty(projectIds)) {
			return;
		}
		List<ProjectPartner> partners = list(
				Wrappers.<ProjectPartner>lambdaQuery().in(ProjectPartner::getProjectId, projectIds));
		if (!partners.isEmpty()) {
			removeByIds(partners.stream().map(ProjectPartner::getId).collect(Collectors.toList()));
		}
		evictProjectPermissions(partners);
	}

	@Override
	public void assertProjectOwner(String projectId) {
		if (projectId == null
				|| count(Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, projectId)
						.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId())
						.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.OWNER.getType())) == 0) {
			throw new AccessDeniedException("只有项目所有者可以管理成员");
		}
	}

	@Override
	public void assertCanGrant(String projectId) {
		if (isBlank(projectId)) {
			throw new AccessDeniedException("未指定项目");
		}
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		String userId = SecurityContextUtils.getUserId();

		boolean owner = count(Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, projectId)
				.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.OWNER.getType())
				.eq(ProjectPartner::getUserId, userId)) > 0;
		if (owner) {
			return;
		}

		Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		long grantor = count(Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, projectId)
				.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.COLLABORATOR.getType())
				.ge(ProjectPartner::getAccessLevel, ACCESS_LEVEL_GRANT).and(w -> {
					w.eq(ProjectPartner::getUserId, userId);
					if (!deptScope.isEmpty()) {
						w.or().isNotNull(ProjectPartner::getGroupId).in(ProjectPartner::getGroupId, deptScope);
					}
				}));
		if (grantor == 0) {
			throw new AccessDeniedException("只有项目所有者或可授权的协作者可以管理成员");
		}
	}

	@Override
	public int accessLevel(String projectId) {
		if (isBlank(projectId)) {
			return 0;
		}
		if (SecurityContextUtils.isAdmin()) {
			return ACCESS_LEVEL_GRANT;
		}


		int level = directAccessLevel(projectId);
		String cursor = projectId;
		int depth = 0;
		while (level < ACCESS_LEVEL_GRANT && depth++ < MAX_FOLDER_DEPTH) {
			Project project = projectMapper.selectById(cursor);
			if (project == null) {
				break;
			}
			String parentId = project.getParentId();
			if (isBlank(parentId) || "0".equals(parentId)) {
				break;
			}
			level = Math.max(level, directAccessLevel(parentId));
			cursor = parentId;
		}
		return level;
	}

	/** 项目自身的授权级别（不含文件夹继承） */
	private int directAccessLevel(String projectId) {
		String userId = SecurityContextUtils.getUserId();
		Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		List<ProjectPartner> partners = list(Wrappers.<ProjectPartner>lambdaQuery()
				.eq(ProjectPartner::getProjectId, projectId).and(w -> {
					w.eq(ProjectPartner::getUserId, userId);
					if (!deptScope.isEmpty()) {
						w.or().isNotNull(ProjectPartner::getGroupId).in(ProjectPartner::getGroupId, deptScope);
					}
				}));
		int level = 0;
		for (ProjectPartner partner : partners) {
			Integer type = partner.getType();
			if (Objects.equals(type, ProjectPartnerTypeEnum.OWNER.getType())) {
				return ACCESS_LEVEL_GRANT;
			}
			if (Objects.equals(type, ProjectPartnerTypeEnum.COLLABORATOR.getType())) {
				level = Math.max(level, normalizeAccessLevel(partner.getAccessLevel()));
			}
			else if (Objects.equals(type, ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType())) {
				level = Math.max(level, ACCESS_LEVEL_VIEW);
			}
		}
		return level;
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

	/** 成员变更后失效「我可见的项目」缓存（projectPermissionCache） */
	private void evictProjectPermissions(Collection<ProjectPartner> partners) {
		if (CollectionUtils.isEmpty(partners)) {
			return;
		}
		if (partners.stream().anyMatch(partner -> partner.getGroupId() != null)) {
			evictAllProjectPermissions();
			return;
		}

		Set<String> affectedUserIds = partners.stream().map(ProjectPartner::getUserId).filter(Objects::nonNull)
				.collect(Collectors.toSet());
		evictProjectPermissionsForUsers(affectedUserIds);
	}

	private void evictProjectPermissionsForUsers(Collection<String> userIds) {
		Cache permissionCache = cacheManager.getCache(CacheConsts.projectPermissionCacheName);
		if (permissionCache == null || CollectionUtils.isEmpty(userIds)) {
			return;
		}
		runAfterCommit(() -> userIds.forEach(permissionCache::evictIfPresent));
	}

	/** 清空全量「我可见的项目」缓存（组授权变更、批量删除时用） */
	private void evictAllProjectPermissions() {
		Cache permissionCache = cacheManager.getCache(CacheConsts.projectPermissionCacheName);
		if (permissionCache == null) {
			return;
		}
		runAfterCommit(permissionCache::clear);
	}

	/** 事务内注册 afterCommit 清理，避免并发的读请求把旧结果重新塞回缓存 */
	private void runAfterCommit(Runnable action) {
		if (TransactionSynchronizationManager.isActualTransactionActive()
				&& TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					action.run();
				}
			});
		}
		else {
			action.run();
		}
	}

	@Override
	public boolean hasProjectAccess(String projectId) {
		if (!StringUtils.hasText(projectId)) {
			return false;
		}
		if (SecurityContextUtils.isAdmin()) {
			return true;
		}
		if (getProjectPerms().contains(projectId)) {
			return true;
		}

		return !answerAccessGuard.readableClassIds(projectId).isEmpty();
	}

	@Override
	public List<String> getProjectPerms() {
		String userId = SecurityContextUtils.getUserId();
		Set<String> result = new java.util.LinkedHashSet<>(getBaseMapper().getProjectPerms(userId));


		Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		if (!deptScope.isEmpty()) {
			list(Wrappers.<ProjectPartner>lambdaQuery().in(ProjectPartner::getGroupId, deptScope)
					.in(ProjectPartner::getType,
							Arrays.asList(ProjectPartnerTypeEnum.OWNER.getType(),
									ProjectPartnerTypeEnum.COLLABORATOR.getType())))
					.stream().map(ProjectPartner::getProjectId).filter(Objects::nonNull).forEach(result::add);
		}
		return new ArrayList<>(expandFolderGrants(result));
	}

	/** 文件夹授权向下继承：被授权的文件夹 → 里面所有层级的项目都算「可见」 */
	private Set<String> expandFolderGrants(Set<String> granted) {
		if (granted.isEmpty()) {
			return granted;
		}
		List<Project> projects = projectMapper.selectList(Wrappers.<Project>lambdaQuery()
				.select(Project::getId, Project::getParentId, Project::getMode));
		if (projects.isEmpty()) {
			return granted;
		}
		java.util.Map<String, List<String>> children = new java.util.HashMap<>();
		for (Project project : projects) {
			if (project.getParentId() != null && !"0".equals(project.getParentId())) {
				children.computeIfAbsent(project.getParentId(), k -> new java.util.ArrayList<>()).add(project.getId());
			}
		}
		Set<String> result = new java.util.LinkedHashSet<>(granted);
		java.util.Deque<String> queue = new java.util.ArrayDeque<>(granted);
		int guard = 0;
		while (!queue.isEmpty() && guard++ < 100000) {
			String parent = queue.poll();
			for (String child : children.getOrDefault(parent, java.util.Collections.emptyList())) {
				if (result.add(child)) {
					queue.add(child);
				}
			}
		}
		return result;
	}

	@Override
	@SneakyThrows
	public void downloadPartner(ProjectPartnerQuery query) {
		query.setPageSize(-1);
		List<ProjectPartnerView> result = listProjectPartner(query).getList();
		List<List<Object>> rows = result.stream().map(r -> {
			List<Object> row = new ArrayList<>();
			if (r.getType() == ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType()) {
				row.add(r.getUser().getName());
			}
			else {
				row.add(r.getUserName());
			}
			row.add(AppConsts.ProjectPartnerStatus.getStatusStr(r.getStatus()));
			return row;
		}).collect(Collectors.toList());
		new ExcelExporter.Builder().setOutputStream(ContextHelper.getCurrentHttpResponse().getOutputStream())
				.setRows(rows).setColumns(Arrays.asList("名单", "状态")).build().exportToStream();
	}

	@Override
	@SneakyThrows
	public void importPartner(WhiteListRequest request) {
		ExcelImportSecurity.validateFile(request.getFile());
		ExcelImportSecurity.RowGuard rowGuard = ExcelImportSecurity.newRowGuard();
		List<String> userIds = new ArrayList<>();
		try (InputStream is = request.getFile().getInputStream(); ReadableWorkbook wb = new ReadableWorkbook(is)) {
			wb.getSheets().forEach(sheet -> {
				int[] rowNum = { 1 };
				try (Stream<Row> rows = sheet.openStream()) {
					rows.forEach(r -> {
						rowGuard.validate(r);
						if (r.getRowNum() == 1) {
							return;
						}
						rowNum[0] = r.getRowNum();
						if (getCellValue(r, 0).isPresent() && getCellValue(r, 1).isPresent()) {
							User user = userService.getBaseMapper().getUser(getCellValue(r, 0).get(),
									getCellValue(r, 1).get());
							if (user != null) {
								userIds.add(user.getId());
							}
						}

					});
				}
				catch (Exception e) {
					throw new InternalServerError(String.format("模板第%d行解析失败", rowNum[0]), e);
				}
			});
		}
		ProjectPartnerRequest addRequest = new ProjectPartnerRequest();
		addRequest.setProjectId(request.getProjectId());
		addRequest.setUserIds(userIds);
		addRequest.setType(ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType());
		addProjectPartner(addRequest);
	}

	private Optional<String> getCellValue(Row row, int cellIndex) {
		String cellValue = row.getCellAsString(cellIndex).orElse(null);
		if (isBlank(cellValue)) {
			return Optional.empty();
		}
		return Optional.of(cellValue);
	}

}
