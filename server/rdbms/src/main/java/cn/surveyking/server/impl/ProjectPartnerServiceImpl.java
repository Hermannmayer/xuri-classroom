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
import cn.surveyking.server.domain.model.ProjectPartner;
import cn.surveyking.server.domain.model.User;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.validation.ValidationException;
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

/**
 * @author javahuang
 * @date 2022/1/28
 */
@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class ProjectPartnerServiceImpl extends BaseService<ProjectPartnerMapper, ProjectPartner>
		implements ProjectPartnerService {

	private final UserServiceImpl userService;

	private final UserDeptScopeService userDeptScopeService;

	private final CacheManager cacheManager;

	private final ProjectPartnerViewMapper projectPartnerViewMapper;

	/** 授权级别：1 只读 */
	private static final int ACCESS_LEVEL_VIEW = 1;

	/** 授权级别：2 可编辑（含只读） */
	private static final int ACCESS_LEVEL_EDIT = 2;

	/** 授权级别：3 可授权（含编辑） */
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
		// 首任所有者由 addProject 内部写入（此刻项目还没有 owner），跳过授权校验；
		// 其余情况（协作者、答卷人）都要求调用者「可授权」（owner / admin / access_level=3 的协作者）
		if (!(type == ProjectPartnerTypeEnum.OWNER.getType() && ownerCount == 0)) {
			assertCanGrant(request.getProjectId());
		}
		// 授权给用户组：只写一条 group_id 记录，组员自动继承。
		// type=2 是「教师组协作者」（带级别），type=3 仍是原来的班级/学员组（只读）
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
				// 协作者组改级别：更新原记录，不要再插一条重复的组授权
				ProjectPartner update = new ProjectPartner();
				update.setId(exist.getId());
				update.setAccessLevel(level);
				updateById(update);
			}
			// 组授权的变化在行上看不出影响哪些用户，直接清全量（见 evictProjectPermissions 注释）
			evictAllProjectPermissions();
			return;
		}
		// 添加/更新成员：协作者按请求级别，答卷人固定只读
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
		// 已是协作者的：重复添加时按新级别更新，而不是静默跳过
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
		// 级别或成员范围变了：按用户失效「我可见的项目」缓存
		evictProjectPermissionsForUsers(request.getUserIds());
	}

	@Override
	public void deleteProjectPartner(ProjectPartnerRequest request) {
		if (CollectionUtils.isEmpty(request.getIds()) && CollectionUtils.isEmpty(request.getProjectIds())
				&& request.getProjectId() == null) {
			throw new AccessDeniedException("未指定要删除的项目成员");
		}
		// 授权闸门：owner / admin / access_level=3 的协作者
		if (!isBlank(request.getProjectId())) {
			assertCanGrant(request.getProjectId());
		}
		List<ProjectPartner> partners = list(Wrappers.<ProjectPartner>lambdaQuery()
				.in(CollectionUtils.isNotEmpty(request.getIds()), ProjectPartner::getId, request.getIds())
				.in(CollectionUtils.isNotEmpty(request.getProjectIds()), ProjectPartner::getProjectId,
						request.getProjectIds())
				.eq(request.getProjectId() != null, ProjectPartner::getProjectId, request.getProjectId()));
		// 按 ids / projectIds 批量删时，逐个涉及的项目校验（projectId 那个上面已经校验过）
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
			// 所有者不按级别处理；答卷人只读，也不需要级别
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
		// 所有者：全权
		boolean owner = count(Wrappers.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getProjectId, projectId)
				.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.OWNER.getType())
				.eq(ProjectPartner::getUserId, userId)) > 0;
		if (owner) {
			return;
		}
		// 被授到「可授权」（access_level=3）的协作者；按组授权的组员也算（主组 + 附加组 + 祖先链）
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
		String userId = SecurityContextUtils.getUserId();
		if (SecurityContextUtils.isAdmin()) {
			return ACCESS_LEVEL_GRANT;
		}
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

	/**
	 * 成员变更后失效「我可见的项目」缓存（projectPermissionCache）。
	 *
	 * <p>
	 * 这个缓存的 key 是<b>用户 id</b>（`getProjectPerms()` 的 @Cacheable），不是项目 id，
	 * 所以没法「按 projectId 精确 evict」，只能按受影响的用户 evict；组授权（groupId）在
	 * 行上看不出成员是谁，直接清全量——重算只是一条轻量 SQL，代价远小于「撤销后仍能访问」。
	 */
	private void evictProjectPermissions(Collection<ProjectPartner> partners) {
		if (CollectionUtils.isEmpty(partners)) {
			return;
		}
		if (partners.stream().anyMatch(partner -> partner.getGroupId() != null)) {
			evictAllProjectPermissions();
			return;
		}
		// 不按 type 过滤：OWNER/COLLABORATOR 直接决定可见项目，答卷人（3/4）顺手清掉也不会错
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
	public List<String> getProjectPerms() {
		String userId = SecurityContextUtils.getUserId();
		Set<String> result = new java.util.LinkedHashSet<>(getBaseMapper().getProjectPerms(userId));
		// 按用户组授权的项目（group_id 存 dept id）：之前只查 user_id，
		// 组协作者在「数据/报表/答卷列表」这些 @EnableDataPerm 接口上会被误判 403。
		Set<String> deptScope = userDeptScopeService.resolveDeptScope(userId);
		if (!deptScope.isEmpty()) {
			list(Wrappers.<ProjectPartner>lambdaQuery().in(ProjectPartner::getGroupId, deptScope)
					.in(ProjectPartner::getType,
							Arrays.asList(ProjectPartnerTypeEnum.OWNER.getType(),
									ProjectPartnerTypeEnum.COLLABORATOR.getType())))
					.stream().map(ProjectPartner::getProjectId).filter(Objects::nonNull).forEach(result::add);
		}
		return new ArrayList<>(result);
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
