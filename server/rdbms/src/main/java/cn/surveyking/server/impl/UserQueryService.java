package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.RoleViewMapper;
import cn.surveyking.server.domain.mapper.UserPositionDtoMapper;
import cn.surveyking.server.domain.mapper.UserViewMapper;
import cn.surveyking.server.domain.model.*;
import cn.surveyking.server.mapper.*;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.SystemService;
import cn.surveyking.server.service.UserService;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 用户查询：列表、候选项、分组、协作者、我的任务。
 *
 * <p>
 * 从 {@code UserServiceImpl} 切出的查询块，全部只读。分页不再继承 {@code ServiceImpl}：
 * {@link #pageByQuery(PageQuery, Wrapper)} 与 {@code BaseService#pageByQuery} 等价
 * （同样是 new Page + {@code baseMapper.selectPage}）。
 *
 * <p>
 * 「取当前用户实时信息」一律走 {@link UserAuthService#buildUserInfo(String)}（不带缓存），
 * 与原来 {@code getUsersByGroup} 里自调用 {@code loadUserById} 的效果一致。
 */
@Component
@RequiredArgsConstructor
public class UserQueryService {

	private final UserMapper userMapper;

	private final UserDeptMapper userDeptMapper;

	private final DeptMapper deptMapper;

	private final AccountMapper accountMapper;

	private final UserRoleMapper userRoleMapper;

	private final UserPositionMapper userPositionMapper;

	private final UserPositionDtoMapper userPositionDtoMapper;

	private final RoleViewMapper roleViewMapper;

	private final UserViewMapper userViewMapper;

	private final RoleServiceImpl roleService;

	private final ProjectMapper projectMapper;

	private final SystemService systemService;

	private final UserDeptMembershipService deptService;

	private final UserAuthService userAuthService;

	public PaginationResponse<UserView> getUsers(UserQuery query) {
		List<String> orgIds = deptService.getChildOrgIds(query.getDeptId());
		LambdaQueryWrapper<User> userQuery = Wrappers.<User>lambdaQuery()
				.like(isNotBlank(query.getName()), User::getName, query.getName())
				// 用户管理与班级管理各看各的：staff / student
				.eq(isNotBlank(query.getUserType()), User::getUserType, query.getUserType())
				.exists(isNotBlank(query.getRoleId()),
						"select 1 from t_user_role t where t.user_id = t_user.id and t.role_id = {0}",
						query.getRoleId())
				.notExists(isNotBlank(query.getNeRoleId()),
						"select 1 from t_user_role t where t.user_id = t_user.id and t.role_id = {0}",
						query.getNeRoleId())
				.in(query.getIds() != null, User::getId,
						Arrays.asList(query.getIds() != null ? query.getIds() : new String[0]));
		// 一人多组：按组筛选时主组或附加组命中都算，否则加进附加组的人在这个列表里「搜不到」
		deptService.applyUserDeptScope(userQuery, orgIds);
		// 数据范围：非管理员只看自己组链下的用户 + 自己建的账号（管理员全量）
		deptService.applyCurrentUserDataScope(userQuery);
		Page<User> userPage = pageByQuery(query, userQuery);
		List<User> records = userPage.getRecords();
		// 一人多组：整页一次性取出附加组与组名，避免每行再查库
		List<String> userIds = records.stream().map(User::getId).filter(StringUtils::hasText)
				.collect(Collectors.toList());
		Map<String, List<String>> extraDeptIdsByUser = new HashMap<>();
		if (!userIds.isEmpty()) {
			userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery().in(UserDept::getUserId, userIds))
					.forEach(binding -> {
						if (StringUtils.hasText(binding.getUserId()) && StringUtils.hasText(binding.getDeptId())) {
							extraDeptIdsByUser.computeIfAbsent(binding.getUserId(), key -> new ArrayList<>())
									.add(binding.getDeptId());
						}
					});
		}
		Set<String> deptIdsInPage = new HashSet<>();
		records.forEach(user -> {
			if (StringUtils.hasText(user.getDeptId())) {
				deptIdsInPage.add(user.getDeptId());
			}
			deptIdsInPage.addAll(extraDeptIdsByUser.getOrDefault(user.getId(), Collections.emptyList()));
		});
		Map<String, String> deptNameById = deptIdsInPage.isEmpty() ? Collections.emptyMap()
				: deptMapper.selectBatchIds(deptIdsInPage).stream().filter(Objects::nonNull)
						.collect(Collectors.toMap(Dept::getId,
								dept -> isNotBlank(dept.getName()) ? dept.getName() : dept.getId(), (a, b) -> a));
		return new PaginationResponse<>(userPage.getTotal(), records.stream().map(x -> {
			UserView userView = userViewMapper.toView(x);
			Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery().eq(Account::getUserId, x.getId())
					.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()));
			userView.setUsername(account.getAuthAccount());
			userView.setStatus(account.getStatus());
			// 设置用户部门（deptName 仍是主组名；附加组单独给 deptIds/deptNames）
			if (StringUtils.hasText(x.getDeptId())) {
				userView.setDeptName(deptNameById.getOrDefault(x.getDeptId(), x.getDeptId()));
			}
			List<String> extraDeptIds = extraDeptIdsByUser.getOrDefault(x.getId(), Collections.emptyList());
			userView.setDeptIds(extraDeptIds);
			userView.setDeptNames(extraDeptIds.stream().map(deptId -> deptNameById.getOrDefault(deptId, deptId))
					.collect(Collectors.toList()));
			// 设置用户角色
			userView.setRoles(
					userRoleMapper.selectList(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, x.getId()))
							.stream().map(userRole -> roleViewMapper.toView(roleService.getById(userRole.getRoleId())))
							.collect(Collectors.toList()));
			// 设置用户岗位
			userView.setUserPositions(userPositionDtoMapper.toView(userPositionMapper
					.selectList(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getUserId, x.getId()))));
			return userView;
		}).collect(Collectors.toList()));
	}

	public List<UserOptionView> listUserOptions(String keyword) {
		List<User> users = userMapper.selectList(Wrappers.<User>lambdaQuery()
				.like(StringUtils.hasText(keyword), User::getName, keyword).orderByAsc(User::getName)
				.last("LIMIT 200"));
		if (users.isEmpty()) {
			return Collections.emptyList();
		}
		List<String> userIds = users.stream().map(User::getId).collect(Collectors.toList());
		Map<String, String> usernames = accountMapper
				.selectList(Wrappers.<Account>lambdaQuery().in(Account::getUserId, userIds)
						.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()))
				.stream().filter(account -> StringUtils.hasText(account.getUserId()))
				.collect(Collectors.toMap(Account::getUserId, Account::getAuthAccount, (a, b) -> a));
		Set<String> deptIds = users.stream().map(User::getDeptId).filter(StringUtils::hasText)
				.collect(Collectors.toSet());
		Map<String, String> deptNames = deptIds.isEmpty() ? Collections.emptyMap()
				: deptMapper.selectBatchIds(deptIds).stream().filter(Objects::nonNull)
						.collect(Collectors.toMap(Dept::getId, Dept::getName, (a, b) -> a));
		return users.stream().map(user -> {
			UserOptionView view = new UserOptionView();
			view.setId(user.getId());
			view.setName(user.getName());
			view.setUsername(usernames.get(user.getId()));
			view.setDeptName(user.getDeptId() == null ? null : deptNames.get(user.getDeptId()));
			return view;
		}).collect(Collectors.toList());
	}

	public List<UserInfo> selectUsers(SelectUserRequest request) {
		List<String> list = new ArrayList<>();
		if (request.getDeptId() != null) {
			list.add(request.getDeptId());
			deptService.getTreeDeptId(request.getDeptId(), list);
		}
		LambdaQueryWrapper<User> userQuery = Wrappers.<User>lambdaQuery().select(User::getId)
				.like(StringUtils.hasText(request.getName()), User::getName, request.getName());
		// 一人多组：协作者候选按组筛选时，附加组命中的用户也要出现
		deptService.applyUserDeptScope(userQuery, StringUtils.hasText(request.getDeptId()) ? list : Collections.emptyList());
		List<User> users = userMapper.selectList(userQuery);
		List<UserInfo> result = Stream.concat(users.stream().map(user -> user.getId()), request.getSelected().stream())
				.collect(Collectors.toSet()).stream()
				.map(userId -> ContextHelper.getBean(UserService.class).loadUserById(userId))
				.collect(Collectors.toList());
		// 协作者候选：只留具备协作权限的账号（默认 project:create），学员会被过滤掉。
		// 注意必须在 simpleMode() 之前判断——simpleMode 会剥掉 authorityList。
		if (Boolean.TRUE.equals(request.getCollaboratorOnly())) {
			String required = resolveCollaboratorAuthority();
			result = result.stream().filter(user -> hasCollaboratorAuthority(user, required))
					.collect(Collectors.toList());
		}
		return result.stream().map(UserInfo::simpleMode).collect(Collectors.toList());
	}

	/** 管理端可配置「谁可以当协作者」，没配时用 project:create 兜底 */
	private String resolveCollaboratorAuthority() {
		try {
			SystemInfo info = systemService.getSystemInfo();
			if (info != null && info.getSetting() != null
					&& StringUtils.hasText(info.getSetting().getCollaboratorAuthority())) {
				return info.getSetting().getCollaboratorAuthority().trim();
			}
		}
		catch (Exception ignored) {
			// 读系统设置失败不影响用户列表，退回默认值
		}
		return "project:create";
	}

	private boolean hasCollaboratorAuthority(UserInfo user, String required) {
		List<String> authorities = user.getAuthorityList();
		if (authorities == null || authorities.isEmpty()) {
			return false;
		}
		return authorities.contains("ROLE_admin") || authorities.contains(required);
	}

	public Set<String> getUserGroups(String userId) {
		Set<String> groups = new LinkedHashSet<>();
		// 获取用户的系统角色
		userRoleMapper.selectList(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, userId)).forEach(role -> {
			groups.add("R:" + role.getRoleId());
		});
		// 获取用户的用户岗位
		userPositionMapper.selectList(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getUserId, userId))
				.forEach(userPosition -> {
					groups.add("P:" + userPosition.getDeptId() + ":" + userPosition.getPositionId());
					groups.add("P:" + "ALL:" + userPosition.getPositionId());
					groups.add("P:" + userPosition.getDeptId() + ":ALL");
				});
		// User current = getById(userId);
		groups.add("U:" + userId);
		// groups.add("P:" + current.getOrgId() + ":");
		return groups;
	}

	public Set<String> getUsersByGroup(String groupId, String currentUser) {
		// 获取角色下面的所有用户
		if (groupId.startsWith("R:")) {
			return userRoleMapper
					.selectList(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getRoleId, groupId.split(":")[1]))
					.stream().map(x -> x.getUserId()).collect(Collectors.toSet());
		}
		if (groupId.startsWith("P:")) {
			String[] orgAndPositionId = groupId.split(":");
			String orgId = orgAndPositionId[1], positionId = orgAndPositionId[2];
			if (orgId.contains(AppConsts.VARIABLE_CURRENT_ORG_ID)) {
				orgId = userAuthService.buildUserInfo(currentUser).getDeptId();
			}
			else if (orgId.contains(AppConsts.VARIABLE_PARENT_ORG_ID)) {
				orgId = userAuthService.buildUserInfo(currentUser).getDeptId();
				orgId = deptMapper.selectById(orgId).getParentId();
			}
			return userPositionMapper
					.selectList(Wrappers.<UserPosition>lambdaQuery()
							.eq(StringUtils.hasText(orgId), UserPosition::getDeptId, orgId)
							.eq(StringUtils.hasText(positionId), UserPosition::getPositionId, positionId))
					.stream().map(up -> up.getUserId()).collect(Collectors.toSet());
		}
		return Collections.EMPTY_SET;
	}

	public UserOverview getUserOverviewData() {
		UserOverview userOverview = new UserOverview();
		ProjectPartnerServiceImpl partnerService = (ProjectPartnerServiceImpl) ContextHelper
				.getBean(ProjectPartnerService.class);
		userOverview.setSurveyCount(partnerService.count(Wrappers.<ProjectPartner>lambdaQuery()
				.in(ProjectPartner::getType,
						Arrays.asList(ProjectPartnerTypeEnum.OWNER.getType(),
								ProjectPartnerTypeEnum.COLLABORATOR.getType()))
				.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId())
				.exists("SELECT 1 FROM t_project t WHERE t.mode = {0} AND t.id = t_project_partner.project_id",
						ProjectModeEnum.survey.name())));

		userOverview.setExamCount(partnerService.count(Wrappers.<ProjectPartner>lambdaQuery()
				.in(ProjectPartner::getType,
						Arrays.asList(ProjectPartnerTypeEnum.OWNER.getType(),
								ProjectPartnerTypeEnum.COLLABORATOR.getType()))
				.eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId())
				.exists("SELECT 1 FROM t_project t WHERE t.mode = {0} AND t.id = t_project_partner.project_id",
						ProjectModeEnum.exam.name())));
		return userOverview;
	}

	public PaginationResponse<MyTaskView> queryTask(MyTaskQuery query) {
		Page<ProjectPartner> page = ContextHelper.getBean(ProjectPartnerServiceImpl.class).pageByQuery(query, Wrappers
				.<ProjectPartner>lambdaQuery().eq(ProjectPartner::getUserId, SecurityContextUtils.getUserId())
				.ne(ProjectPartner::getStatus, AppConsts.ProjectPartnerStatus.ANSWERED)
				.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.RESPONDENT_SYS_USER.getType())
				.exists("SELECT 1 FROM t_project t WHERE t.mode = {0} AND t.id = t_project_partner.project_id And t.is_deleted = 0",
						query.getType())
				.orderByAsc(ProjectPartner::getStatus).orderByDesc(ProjectPartner::getCreateAt));
		PaginationResponse<MyTaskView> result = new PaginationResponse<>(page.getTotal(),
				page.getRecords().stream().map(projectPartner -> {
					MyTaskView taskView = new MyTaskView();
					Project project = projectMapper.selectById(projectPartner.getProjectId());
					taskView.setId(projectPartner.getId());
					taskView.setProjectId(projectPartner.getProjectId());
					taskView.setName(project.getName());
					taskView.setStatus(projectPartner.getStatus());
					taskView.setExamStartTime(project.getSetting().getExamSetting().getStartTime());
					taskView.setExamEndTime(project.getSetting().getExamSetting().getEndTime());
					return taskView;
				}).collect(Collectors.toList()));
		return result;
	}

	public PaginationResponse<MyTaskView> queryHistoryTask(MyTaskQuery query) {
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());
		ContextHelper.getBean(AnswerServiceImpl.class).page(page,
				Wrappers.<Answer>lambdaQuery().eq(Answer::getCreateBy, SecurityContextUtils.getUserId()).exists(
						"SELECT 1 FROM t_project t WHERE t.mode = {0} AND t.id = t_answer.project_id And t.is_deleted = 0",
						query.getType()).orderByDesc(Answer::getCreateAt));
		if (page.getTotal() == 0) {
			return new PaginationResponse<>(0l, new ArrayList<>());
		}
		List<Project> projectList = projectMapper.selectList(Wrappers.<Project>lambdaQuery().in(Project::getId,
				page.getRecords().stream().map(x -> x.getProjectId()).collect(Collectors.toSet())));

		PaginationResponse<MyTaskView> result = new PaginationResponse<>(page.getTotal(),
				page.getRecords().stream().map(answer -> {
					MyTaskView taskView = new MyTaskView();
					taskView.setId(answer.getId());
					taskView.setAnswerId(answer.getId());

					Project project = projectList.stream().filter(x -> x.getId().equals(answer.getProjectId()))
							.findFirst().orElse(null);
					if (project != null) {
						taskView.setProjectId(project.getId());
						taskView.setName(project.getName());
						if (ProjectModeEnum.exam.equals(project.getMode())) {
							taskView.setExamScore(answer.getExamScore());
							taskView.setExamTotal(project.getSurvey().getAttribute().getExamScore());
						}
					}

					try {
						taskView.setStartTime(answer.getMetaInfo().getAnswerInfo().getStartTime());
						taskView.setEndTime(answer.getMetaInfo().getAnswerInfo().getEndTime());
					}
					catch (Exception e) {
						// ignore error
					}
					return taskView;
				}).collect(Collectors.toList()));
		return result;

	}

	/** 与 {@code BaseService.pageByQuery(PageQuery, Wrapper)} 等价：组件不继承 ServiceImpl，直接走 Mapper */
	private Page<User> pageByQuery(PageQuery query, Wrapper<User> wrapper) {
		Page<User> page = new Page<>(query.getCurrent(), query.getPageSize());
		return userMapper.selectPage(page, wrapper);
	}

}
