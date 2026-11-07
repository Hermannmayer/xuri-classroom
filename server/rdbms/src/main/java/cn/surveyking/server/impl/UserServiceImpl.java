package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.CacheConsts;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.constant.ProjectPartnerTypeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.security.PasswordEncoder;
import cn.surveyking.server.core.uitls.ContextHelper;
import cn.surveyking.server.core.uitls.ExcelImportSecurity;
import cn.surveyking.server.core.uitls.PinyinUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.domain.mapper.RoleViewMapper;
import cn.surveyking.server.domain.mapper.UserPositionDtoMapper;
import cn.surveyking.server.domain.mapper.UserViewMapper;
import cn.surveyking.server.domain.model.*;
import cn.surveyking.server.mapper.*;
import cn.surveyking.server.service.BaseService;
import cn.surveyking.server.service.ProjectPartnerService;
import cn.surveyking.server.service.SystemService;
import cn.surveyking.server.service.UserService;
import com.anji.captcha.model.common.ResponseModel;
import com.anji.captcha.model.vo.CaptchaVO;
import com.anji.captcha.service.CaptchaService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import javax.validation.ValidationException;
import java.io.InputStream;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static java.lang.String.format;
import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * @author javahuang
 * @date 2021/8/24getCellValue
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl extends BaseService<UserMapper, User> implements UserService {

	private static final String ROOT_DEPT_PARENT_ID = "0";

	private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile("^.{8,32}$");

	private final AccountMapper accountMapper;

	private final PasswordEncoder passwordEncoder;

	private final RoleViewMapper roleViewMapper;

	private final UserViewMapper userViewMapper;

	private final UserRoleMapper userRoleMapper;

	private final RoleServiceImpl roleService;

	private final UserPositionMapper userPositionMapper;

	private final UserPositionDtoMapper userPositionDtoMapper;

	private final UserDeptMapper userDeptMapper;

	/** 组绑角色（t_dept_role）；用 Mapper 而不是 DeptService，避免 UserService ↔ DeptService 循环依赖 */
	private final DeptRoleMapper deptRoleMapper;

	private final MessageSource messageSource;

	private final DeptMapper deptMapper;

	private final SystemService systemService;

	private final ProjectMapper projectMapper;

	private final CaptchaService captchaService;

	private final CacheManager cacheManager;

	/**
	 * @param username 账号密码登录认证使用
	 * @return
	 * @throws UsernameNotFoundException
	 */
	@Override
	public UserInfo loadUserByUsername(String username) throws UsernameNotFoundException {
		LambdaQueryWrapper<Account> queryWrapper = Wrappers.<Account>lambdaQuery()
				.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()).eq(Account::getAuthAccount, username);
		Account existAccount = accountMapper.selectOne(queryWrapper);
		if (existAccount == null) {
			throw new UsernameNotFoundException(i18n("user.service.notFound", username));
		}
		if (existAccount.getStatus() != AppConsts.USER_STATUS.VALID) {
			throw new AccessDeniedException(i18n("user.service.disabled", username));
		}
		// 用户组有效期：过期后不允许登录（匿名答题走公开链接，不受此限）
		assertDeptValid(existAccount.getUserId());

		return userViewMapper.toUserView(existAccount);
	}

	/**
	 * 校验用户所属组链的有效期。
	 * 用户可能是「主组 + 若干附加组」（一人多组），每个组各自沿祖先链校验；
	 * 任意一个组（或它的祖先组）不在有效窗口内就拒绝登录，并说明是哪个组。
	 * 组上的 valid_from / valid_to 为空表示不限制。
	 */
	private void assertDeptValid(String userId) {
		if (!StringUtils.hasText(userId)) {
			return;
		}
		User user = this.getById(userId);
		if (user == null) {
			return;
		}
		List<String> rootDeptIds = resolveUserDeptIds(user);
		if (CollectionUtils.isEmpty(rootDeptIds)) {
			return;
		}
		Map<String, Dept> deptMap = loadDeptMap();
		java.util.Date now = new java.util.Date();
		for (String deptId : resolveDeptChainIds(rootDeptIds, deptMap)) {
			Dept dept = deptMap.get(deptId);
			if (dept == null) {
				continue;
			}
			if (dept.getValidFrom() != null && now.before(dept.getValidFrom())) {
				throw new AccessDeniedException("所在用户组「" + dept.getName() + "」尚未到生效时间（"
						+ new java.text.SimpleDateFormat("yyyy-MM-dd").format(dept.getValidFrom()) + " 起），请联系管理员");
			}
			if (dept.getValidTo() != null && now.after(dept.getValidTo())) {
				throw new AccessDeniedException("所在用户组「" + dept.getName() + "」有效期已过（"
						+ new java.text.SimpleDateFormat("yyyy-MM-dd").format(dept.getValidTo()) + " 截止），请联系管理员延期");
			}
		}
	}

	/**
	 * 用户所属的全部组：主组（t_user.dept_id）在前，附加组（t_user_dept）在后，去重。
	 */
	private List<String> resolveUserDeptIds(User user) {
		if (user == null) {
			return Collections.emptyList();
		}
		return mergeDeptIds(user.getDeptId(), listExtraDeptIds(user.getId()));
	}

	private List<String> mergeDeptIds(String mainDeptId, List<String> extraDeptIds) {
		java.util.LinkedHashSet<String> merged = new java.util.LinkedHashSet<>();
		if (StringUtils.hasText(mainDeptId)) {
			merged.add(mainDeptId);
		}
		if (!CollectionUtils.isEmpty(extraDeptIds)) {
			extraDeptIds.stream().filter(StringUtils::hasText).map(String::trim).forEach(merged::add);
		}
		return new ArrayList<>(merged);
	}

	/** 附加组 id（不含主组） */
	private List<String> listExtraDeptIds(String userId) {
		if (!StringUtils.hasText(userId)) {
			return Collections.emptyList();
		}
		return userDeptMapper.selectList(Wrappers.<UserDept>lambdaQuery().eq(UserDept::getUserId, userId)).stream()
				.map(UserDept::getDeptId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
	}

	/**
	 * 重写用户的附加组：先物理删除再插入（唯一键 (user_id, dept_id) 不能和逻辑删除共存）。
	 * 主组已经存在 t_user.dept_id，这里顺带把它从附加组里剔掉，避免同一个组出现两次。
	 */
	private void saveUserDepts(String userId, String mainDeptId, List<String> extraDeptIds) {
		if (!StringUtils.hasText(userId)) {
			return;
		}
		userDeptMapper.deleteByUserId(userId);
		if (CollectionUtils.isEmpty(extraDeptIds)) {
			return;
		}
		extraDeptIds.stream().filter(StringUtils::hasText).map(String::trim)
				.filter(deptId -> !deptId.equals(mainDeptId)).distinct().forEach(deptId -> {
					UserDept userDept = new UserDept();
					userDept.setUserId(userId);
					userDept.setDeptId(deptId);
					userDeptMapper.insert(userDept);
				});
	}

	@Override
	@Cacheable(cacheNames = "userCache", key = "#p0", condition = "#p0!=null", unless = "#result == null")
	public UserInfo loadUserById(String userId) {
		User user = this.getById(userId);
		if (user == null) {
			return null;
		}
		UserInfo userInfo = userViewMapper.toUserInfo(user);
		// 一人多组：主组 + 附加组，各自沿祖先链展开（组表整表取一次，避免逐层查库）
		List<String> extraDeptIds = listExtraDeptIds(user.getId());
		Map<String, Dept> deptMap = loadDeptMap();
		List<String> deptChainIds = resolveDeptChainIds(mergeDeptIds(user.getDeptId(), extraDeptIds), deptMap);

		// 最终权限 = 用户直挂角色 ∪ 所属组（主组 + 附加组，含祖先链）绑定的角色 ∪ ROLE_* 标记。
		// 超级管理员靠 ROLE_admin 放行，这里照常把它的角色标记并进来，不做任何裁剪。
		Set<String> authorities = resolveUserAuthorities(user.getId(), deptChainIds);
		userInfo.setAuthorities(authorities.stream()
				.map(authority -> (GrantedAuthority) () -> authority).collect(Collectors.toSet()));

		// 设置用户部门（deptName 仍然是主组名）
		if (StringUtils.hasText(user.getDeptId())) {
			Dept dept = deptMap.get(user.getDeptId());
			if (dept != null) {
				userInfo.setDeptName(dept.getName());
			}
		}
		userInfo.setDeptIds(extraDeptIds);
		userInfo.setDeptNames(extraDeptIds.stream().map(deptId -> deptNameOf(deptMap, deptId))
				.collect(Collectors.toList()));

		return userInfo;
	}

	/** 一次取出全部用户组（组表很小），供祖先链解析与组名回显复用 */
	private Map<String, Dept> loadDeptMap() {
		return deptMapper.selectList(null).stream().filter(Objects::nonNull)
				.collect(Collectors.toMap(Dept::getId, dept -> dept, (a, b) -> a));
	}

	/** 组 → 名称；查不到回落成 id，避免界面上出现空白标签 */
	private String deptNameOf(Map<String, Dept> deptMap, String deptId) {
		Dept dept = deptMap.get(deptId);
		return dept != null && isNotBlank(dept.getName()) ? dept.getName() : deptId;
	}

	/**
	 * 用户所属组 + 各自祖先链展开后的组 id（去重，主组及其祖先排在最前）。
	 */
	private List<String> resolveDeptChainIds(List<String> rootDeptIds, Map<String, Dept> deptMap) {
		LinkedHashSet<String> chain = new LinkedHashSet<>();
		if (CollectionUtils.isEmpty(rootDeptIds)) {
			return new ArrayList<>(chain);
		}
		Set<String> visited = new HashSet<>();
		for (String rootDeptId : rootDeptIds) {
			String deptId = rootDeptId;
			while (StringUtils.hasText(deptId) && !ROOT_DEPT_PARENT_ID.equals(deptId) && visited.add(deptId)) {
				chain.add(deptId);
				Dept dept = deptMap.get(deptId);
				if (dept == null) {
					break;
				}
				deptId = dept.getParentId();
			}
		}
		return new ArrayList<>(chain);
	}

	/**
	 * 最终权限集合：t_user_role（直挂角色）∪ t_dept_role（组链上绑定的角色）。
	 *
	 * <p>
	 * 只查两次关联表：一次 user_role、一次 dept_role（按整条组链 in），角色再按 id 批量取一次，
	 * 不做「按角色逐条 getById」的 N+1。已停用的角色与直挂角色一样被忽略。
	 */
	private Set<String> resolveUserAuthorities(String userId, List<String> deptChainIds) {
		Set<String> roleIds = new LinkedHashSet<>();
		userRoleMapper.selectList(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, userId)).stream()
				.map(UserRole::getRoleId).filter(StringUtils::hasText).forEach(roleIds::add);
		if (!CollectionUtils.isEmpty(deptChainIds)) {
			deptRoleMapper.selectList(Wrappers.<DeptRole>lambdaQuery().in(DeptRole::getDeptId, deptChainIds)).stream()
					.map(DeptRole::getRoleId).filter(StringUtils::hasText).forEach(roleIds::add);
		}
		if (roleIds.isEmpty()) {
			return new HashSet<>();
		}
		return roleService.listByIds(roleIds).stream()
				.filter(role -> role != null && Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID))
				.flatMap(role -> toAuthorityNames(role).stream()).collect(Collectors.toCollection(HashSet::new));
	}

	@Override
	public PaginationResponse<UserView> getUsers(UserQuery query) {
		List<String> orgIds = getChildOrgIds(query.getDeptId());
		LambdaQueryWrapper<User> userQuery = Wrappers.<User>lambdaQuery()
				.like(isNotBlank(query.getName()), User::getName, query.getName())
				.exists(isNotBlank(query.getRoleId()),
						"select 1 from t_user_role t where t.user_id = t_user.id and t.role_id = {0}",
						query.getRoleId())
				.notExists(isNotBlank(query.getNeRoleId()),
						"select 1 from t_user_role t where t.user_id = t_user.id and t.role_id = {0}",
						query.getNeRoleId())
				.in(query.getIds() != null, User::getId,
						Arrays.asList(query.getIds() != null ? query.getIds() : new String[0]));
		// 一人多组：按组筛选时主组或附加组命中都算，否则加进附加组的人在这个列表里「搜不到」
		applyUserDeptScope(userQuery, orgIds);
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

	private List<String> getChildOrgIds(String parentOrgId) {
		List<String> result = new ArrayList<>();
		if (parentOrgId == null) {
			return result;
		}
		result.add(parentOrgId);
		deptMapper.selectList(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, parentOrgId)).forEach(dept -> {
			result.addAll(getChildOrgIds(dept.getId()));
		});
		return result;
	}

	/**
	 * 「用户属于这些组」的查询条件：主组（t_user.dept_id）命中，或者附加组（t_user_dept）命中。
	 *
	 * <p>
	 * 附加组先转成 user_id 集合再 OR，不把组 id 拼进 SQL 字符串——组 id 来自请求参数，
	 * 直接拼接会有注入风险；这里的组人数是几十到几百量级，IN 列表可以接受。
	 * 组 id 集合为空（没按组筛选）时什么都不加，保持「查全部」的原语义。
	 */
	private void applyUserDeptScope(LambdaQueryWrapper<User> wrapper, List<String> deptIds) {
		if (CollectionUtils.isEmpty(deptIds)) {
			return;
		}
		List<String> extraDeptUserIds = userDeptMapper
				.selectList(Wrappers.<UserDept>lambdaQuery().in(UserDept::getDeptId, deptIds)).stream()
				.map(UserDept::getUserId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		wrapper.and(w -> {
			w.in(User::getDeptId, deptIds);
			if (!extraDeptUserIds.isEmpty()) {
				w.or().in(User::getId, extraDeptUserIds);
			}
		});
	}

	@Override
	public void createUser(UserRequest request) {
		// 把用户放进某个组会连带获得该组（含祖先链）绑定的角色：非管理员必须先确认这些角色他能授予
		assertDeptAssignmentAllowed(request.getDeptId(), request.getDeptIds());
		User user = userViewMapper.fromRequest(request);
		this.save(user);

		// 创建登录账号
		Account account = userViewMapper.toAccount(request);
		account.setAuthType(AppConsts.AUTH_TYPE.PWD.name());
		account.setUserType(AppConsts.USER_TYPE.SysUser.toString());
		account.setAuthSecret(passwordEncoder.encode(request.getPassword()));
		account.setUserId(user.getId());
		account.setStatus(request.getStatus());
		accountMapper.insert(account);

		// 添加用户角色
		request.setId(user.getId());
		addUserRoles(request);
		// 添加用户岗位
		addUserPositions(request);
		// 添加附加组（主组已经在 t_user.dept_id 里）
		saveUserDepts(user.getId(), user.getDeptId(), request.getDeptIds());
	}

	@Override
	public void createSystemUser(UserRequest request) {
		validateStrongPassword(request.getPassword(), null);
		assertGrantableRoles(request.getRoles());
		createUser(request);
	}

	private void addUserRoles(UserRequest request) {
		if (!CollectionUtils.isEmpty(request.getRoles())) {
			request.getRoles().forEach(roleId -> {
				UserRole userRole = new UserRole();
				userRole.setUserId(request.getId());
				userRole.setRoleId(roleId);
				userRole.setUserType(AppConsts.USER_TYPE.SysUser.name());
				userRoleMapper.insert(userRole);
			});
		}
	}

	private void addUserPositions(UserRequest request) {
		if (!CollectionUtils.isEmpty(request.getUserPositions())) {
			request.getUserPositions().forEach(userPositionRequest -> {
				UserPosition userPosition = userPositionDtoMapper.fromRequest(userPositionRequest);
				userPosition.setUserId(request.getId());
				userPositionMapper.insert(userPosition);
			});
		}
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#request.id")
	public void updateUser(UserRequest request) {
		if (request.getId() == null) {
			return;
		}
		assertManageableUser(request.getId());
		assertGrantableRoles(request.getRoles());
		User current = this.getById(request.getId());
		// 组变更同样会改变「有效权限」：目标组链上绑定的角色必须都是自己能授予的，否则等于借改组提权
		assertDeptAssignmentAllowed(request.getDeptId() != null ? request.getDeptId() : current == null ? null : current.getDeptId(),
				request.getDeptIds() != null ? request.getDeptIds() : listExtraDeptIds(request.getId()));
		if (isNotBlank(request.getPassword())) {
			validateStrongPassword(request.getPassword(), null);
		}
		User user = userViewMapper.fromRequest(request);
		this.updateById(user);

		if (request.getStatus() != null || isNotBlank(request.getPassword())) {
			// 更新登录账号
			Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery()
					.eq(Account::getUserId, request.getId()).eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()));
			if (isNotBlank(request.getPassword()) && Objects.equals(request.getId(), SecurityContextUtils.getUserId())
					&& !SecurityContextUtils.isAdmin() && isBlank(request.getOldPassword())) {
				throw new InternalServerError(i18n("user.password.invalid"));
			}
			if (isNotBlank(request.getPassword()) && isNotBlank(request.getOldPassword())) {
				if (!passwordEncoder.matches(request.getOldPassword(), account.getAuthSecret())) {
					throw new InternalServerError(i18n("user.password.invalid"));
				}
			}
			if (request.getUsername() != null) {
				account.setAuthAccount(request.getUsername());
			}
			if (request.getStatus() != null) {
				account.setStatus(request.getStatus());
			}
			if (isNotBlank(request.getPassword())) {
				account.setAuthSecret(passwordEncoder.encode(request.getPassword()));
			}
			accountMapper.updateById(account);
		}

		// 更新用户角色
		if (request.getRoles() != null) {
			userRoleMapper.delete(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, request.getId()));
			addUserRoles(request);
		}
		// 更新用户岗位
		if (request.getUserPositions() != null) {
			userPositionMapper
					.delete(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getUserId, request.getId()));
			addUserPositions(request);
		}
		// 更新附加组（deptIds 为 null 表示本次不改；空数组表示只保留主组）
		if (request.getDeptIds() != null) {
			String mainDeptId = request.getDeptId();
			if (!StringUtils.hasText(mainDeptId)) {
				mainDeptId = current == null ? null : current.getDeptId();
			}
			saveUserDepts(request.getId(), mainDeptId, request.getDeptIds());
		}
		evictUserAfterCommit(request.getId());
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#userId")
	public void updateUserProfile(String userId, UserProfileRequest request) {
		if (userId == null) {
			throw new AccessDeniedException("未登录用户不能修改个人资料");
		}
		User user = new User();
		user.setId(userId);
		user.setName(request.getName());
		user.setAvatar(request.getAvatar());
		user.setProfile(request.getProfile());
		user.setPhone(request.getPhone());
		user.setEmail(request.getEmail());
		user.setGender(request.getGender());
		user.setCorrectTimes(request.getCorrectTimes());
		updateById(user);

		if (isNotBlank(request.getPassword())) {
			validateStrongPassword(request.getPassword(), null);
			if (isBlank(request.getOldPassword())) {
				throw new InternalServerError(i18n("user.password.invalid"));
			}
			Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery().eq(Account::getUserId, userId)
					.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()));
			if (account == null || !passwordEncoder.matches(request.getOldPassword(), account.getAuthSecret())) {
				throw new InternalServerError(i18n("user.password.invalid"));
			}
			account.setAuthSecret(passwordEncoder.encode(request.getPassword()));
			accountMapper.updateById(account);
		}
		evictUserAfterCommit(userId);
	}

	@Override
	@CacheEvict(cacheNames = "userCache", key = "#id")
	public void deleteUser(String id) {
		assertManageableUser(id);
		removeById(id);
		accountMapper.physicallyDeleteExternalByUserId(id);
		accountMapper.delete(Wrappers.<Account>lambdaQuery().eq(Account::getUserId, id));
		// 用户没了，附加组绑定也一起清掉
		userDeptMapper.deleteByUserId(id);
		evictUserAfterCommit(id);
	}

	@Override
	public boolean checkUsernameExist(String username) {
		Account account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery()
				.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()).eq(Account::getAuthAccount, username));
		if (account != null) {
			return true;
		}
		return false;
	}

	@Override
	public void updateUserPosition(UserRequest request) {
		userPositionMapper
				.delete(Wrappers.<UserPosition>lambdaQuery().eq(UserPosition::getPositionId, request.getId()));
		if (!CollectionUtils.isEmpty(request.getUserPositions())) {
			request.getUserPositions().forEach(userPositionRequest -> {
				UserPosition position = userPositionDtoMapper.fromRequest(userPositionRequest);
				position.setUserId(request.getId());
				userPositionMapper.insert(position);
			});
		}
	}

	@Override
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

	@Override
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
				orgId = loadUserById(currentUser).getDeptId();
			}
			else if (orgId.contains(AppConsts.VARIABLE_PARENT_ORG_ID)) {
				orgId = loadUserById(currentUser).getDeptId();
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

	@Override
	public List<UserInfo> selectUsers(SelectUserRequest request) {
		List<String> list = new ArrayList<>();
		if (request.getDeptId() != null) {
			list.add(request.getDeptId());
			this.getTreeDeptId(request.getDeptId(), list);
		}
		LambdaQueryWrapper<User> userQuery = Wrappers.<User>lambdaQuery().select(User::getId)
				.like(StringUtils.hasText(request.getName()), User::getName, request.getName());
		// 一人多组：协作者候选按组筛选时，附加组命中的用户也要出现
		applyUserDeptScope(userQuery, StringUtils.hasText(request.getDeptId()) ? list : Collections.emptyList());
		List<User> users = list(userQuery);
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

	private void getTreeDeptId(String deptId, List<String> list) {
		List<Dept> deptList = deptMapper.selectList(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, deptId));
		Optional.ofNullable(deptList).map(List::stream).orElseGet(Stream::empty).forEach(info -> {
			list.add(info.getId());
			this.getTreeDeptId(info.getId(), list);
		});
	}

	@Override
	public void register(RegisterRequest request) {
		SystemInfo systemInfo = systemService.getSystemInfo();
		SystemInfo.RegisterInfo registerInfo = systemInfo.getRegisterInfo();
		if (registerInfo == null || !Boolean.TRUE.equals(registerInfo.getRegisterEnabled())) {
			throw new ErrorCodeException(ErrorCode.RegisterError);
		}
		validateStrongPassword(request.getPassword(), null);

		long total = accountMapper
				.selectCount(Wrappers.<Account>lambdaQuery().eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name())
						.eq(Account::getAuthAccount, request.getUsername()));
		if (total > 0) {
			throw new ErrorCodeException(ErrorCode.UsernameExists);
		}
		UserRequest createUserRequest = new UserRequest();
		createUserRequest.setUsername(request.getUsername());
		createUserRequest.setPassword(request.getPassword());
		createUserRequest.setName(request.getName());
		createUserRequest.setPhone(request.getPhone());
		String registerDeptId = registerInfo.getDeptId() != null && !registerInfo.getDeptId().isEmpty()
				? registerInfo.getDeptId()
				: getRootDeptId();
		createUserRequest.setDeptId(registerDeptId);
		// 注册用户先进待审核状态（status=0），管理员在用户管理里启用后才能登录
		createUserRequest.setStatus(0);
		// 注册只能是学员；老师/管理员只能由后台分配
		String role = null;
		if (role != null) {
			if (!registerInfo.getRoles().contains(role)) {
				throw new ErrorCodeException(ErrorCode.RegisterError);
			}
			createUserRequest.setRoles(Collections.singletonList(request.getRole()));
		}
		else if (registerInfo.getRoles().size() > 0) {
			createUserRequest.setRoles(registerInfo.getRoles());
		}
		createUser(createUserRequest);
	}

	private String getRootDeptId() {
		return deptMapper
				.selectList(Wrappers.<Dept>lambdaQuery().eq(Dept::getParentId, ROOT_DEPT_PARENT_ID)
						.orderByAsc(Dept::getSortCode).orderByAsc(Dept::getCreateAt))
				.stream().findFirst().map(Dept::getId)
				.orElseThrow(() -> new InternalServerError(i18n("user.register.rootDeptNotFound")));
	}

	@Override
	public List<RegisterRoleView> getRegisterRoles() {
		List<String> defaultRegisterRoleCodes = systemService.getSystemInfo().getRegisterInfo().getRoles();
		if (defaultRegisterRoleCodes.size() > 0) {
			return roleService.listByIds(systemService.getSystemInfo().getRegisterInfo().getRoles()).stream()
					.map(role -> {
						RegisterRoleView roleView = new RegisterRoleView();
						roleView.setId(role.getId());
						roleView.setName(role.getName());
						return roleView;
					}).collect(Collectors.toList());
		}
		return new ArrayList<>();
	}

	@Override
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

	@Override
	@SneakyThrows
	public void importUser(UserRequest request) {
		if (!SecurityContextUtils.hasAuthority("system:user:create")) {
			throw new AccessDeniedException("无权限导入用户");
		}
		if (request.getFile() == null || request.getFile().isEmpty()) {
			throw new InternalServerError(i18n("user.import.fileRequired"));
		}
		ExcelImportSecurity.validateFile(request.getFile());
		ExcelImportSecurity.RowGuard rowGuard = ExcelImportSecurity.newRowGuard();
		Map<String, String> roleName2Id = buildNameIdMap(roleService.list(), Role::getName, Role::getId,
				"user.import.duplicateRoleName");
		Map<String, String> deptName2Id = buildNameIdMap(deptMapper.selectList(null), Dept::getName, Dept::getId,
				"user.import.duplicateDeptName");
		Set<String> usernameSet = new HashSet<>();
		Set<String> existingUsernames = accountMapper
				.selectList(Wrappers.<Account>lambdaQuery().select(Account::getAuthAccount).eq(Account::getAuthType,
						AppConsts.AUTH_TYPE.PWD.name()))
				.stream().map(Account::getAuthAccount).filter(Objects::nonNull).collect(Collectors.toSet());
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
						UserRequest userRequest = new UserRequest();
						userRequest.setName(
								getCellValue(r, 0).orElseThrow(() -> new ErrorCodeException(ErrorCode.FileParseError)));
						userRequest.setUsername(
								getCellValue(r, 1).orElse(PinyinUtils.chineseToPinyin(userRequest.getName())));
						if (existingUsernames.contains(userRequest.getUsername())) {
							throw new InternalServerError(i18n("user.import.usernameExists", rowNum[0]));
						}
						if (!usernameSet.add(userRequest.getUsername())) {
							throw new InternalServerError(i18n("user.import.usernameDuplicate", rowNum[0]));
						}
						// 密码列可以留空，留空时用默认密码 12345678，学员首次登录后自行修改
						String password = getCellValue(r, 2).orElse("12345678");
						validateStrongPassword(password, rowNum[0]);
						userRequest.setPassword(password);
						userRequest.setStatus(AppConsts.USER_STATUS.VALID);
						userRequest.setPhone(getCellValue(r, 3).orElse(null));
						userRequest.setEmail(getCellValue(r, 4).orElse(null));
						String deptName = getCellValue(r, 5).orElse(null);
						if (deptName != null) {
							String deptId = deptName2Id.get(deptName);
							if (deptId == null) {
								throw new InternalServerError(i18n("user.import.deptNotFound", rowNum[0], deptName));
							}
							userRequest.setDeptId(deptId);
						}
						String roles = getCellValue(r, 6).orElse(null);
						if (roles != null) {
							List<String> roleNames = parseImportRoleNames(roles, roleName2Id);
							if (CollectionUtils.isEmpty(roleNames)) {
								throw new InternalServerError(i18n("user.import.roleNotFound", rowNum[0], roles));
							}
							List<String> missingRoleNames = roleNames.stream()
									.filter(roleName -> !roleName2Id.containsKey(roleName))
									.collect(Collectors.toList());
							if (!CollectionUtils.isEmpty(missingRoleNames)) {
								throw new InternalServerError(i18n("user.import.roleNotFound", rowNum[0],
										String.join("、", missingRoleNames)));
							}
							List<String> roleIds = roleNames.stream().map(roleName2Id::get).distinct()
									.collect(Collectors.toList());
							assertGrantableRoles(roleIds);
							userRequest.setRoles(roleIds);
						}
						createUser(userRequest);
					});
				}
				catch (Exception e) {
					if (e instanceof InternalServerError) {
						throw (InternalServerError) e;
					}
					if (e instanceof DuplicateKeyException) {
						throw new InternalServerError(i18n("user.import.userExists", rowNum[0]), e);
					}
					throw new InternalServerError(i18n("user.import.parseError", rowNum[0]), e);
				}
			});
		}
	}

	private void assertManageableUser(String userId) {
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		Set<String> callerAuthorities = currentAuthorityNames();
		if (!callerAuthorities.containsAll(loadAuthorityNames(userId))) {
			throw new AccessDeniedException("不能管理权限高于当前用户的账号（含用户组继承来的权限）");
		}
	}

	/**
	 * 「把用户放进某个组」会连带把该组（含祖先链）绑定的角色授予他，因此非管理员改 deptId / deptIds 时，
	 * 必须确认目标组链上绑定的角色自己都能授予——否则光有 system:user:update 就能把人塞进绑了
	 * admin/teacher 的组，等于绕开 assertGrantableRoles 发角色。
	 *
	 * <p>
	 * 两条豁免：① 管理员；② 匿名调用（注册）：那条路径的组与角色都来自系统设置，不由请求方指定。
	 * 孤儿绑定（角色已被删）不授予任何权限，直接跳过，避免脏数据阻断正常的用户管理。
	 */
	private void assertDeptAssignmentAllowed(String mainDeptId, List<String> extraDeptIds) {
		if (!SecurityContextUtils.isAuthenticated() || SecurityContextUtils.isAdmin()) {
			return;
		}
		List<String> roots = mergeDeptIds(mainDeptId, extraDeptIds);
		if (CollectionUtils.isEmpty(roots)) {
			return;
		}
		List<String> chain = resolveDeptChainIds(roots, loadDeptMap());
		if (CollectionUtils.isEmpty(chain)) {
			return;
		}
		List<String> roleIds = deptRoleMapper
				.selectList(Wrappers.<DeptRole>lambdaQuery().in(DeptRole::getDeptId, chain)).stream()
				.map(DeptRole::getRoleId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		if (roleIds.isEmpty()) {
			return;
		}
		Set<String> callerAuthorities = currentAuthorityNames();
		for (Role role : roleService.listByIds(roleIds)) {
			if (role == null || !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID)) {
				continue;
			}
			Set<String> roleAuthorities = toAuthorityNames(role);
			if (roleAuthorities.contains(AppConsts.ROLE_ADMIN)
					|| !callerAuthorities.containsAll(roleAuthorities)) {
				throw new AccessDeniedException("不能把用户放进该用户组：它（或其上级组）绑定的角色「"
						+ role.getName() + "」权限高于当前用户");
			}
		}
	}

	private void assertGrantableRoles(List<String> roleIds) {
		if (roleIds == null) {
			return;
		}
		List<String> normalizedIds = roleIds.stream().filter(StringUtils::hasText).distinct()
				.collect(Collectors.toList());
		List<Role> roles = normalizedIds.isEmpty() ? Collections.emptyList() : roleService.listByIds(normalizedIds);
		if (roles.size() != normalizedIds.size()
				|| roles.stream().anyMatch(role -> !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID))) {
			throw new AccessDeniedException("不能分配不存在或已停用的角色");
		}
		if (SecurityContextUtils.isAdmin()) {
			return;
		}
		Set<String> callerAuthorities = currentAuthorityNames();
		for (Role role : roles) {
			Set<String> roleAuthorities = toAuthorityNames(role);
			if (roleAuthorities.contains(AppConsts.ROLE_ADMIN) || !callerAuthorities.containsAll(roleAuthorities)) {
				throw new AccessDeniedException("不能分配权限高于当前用户的角色");
			}
		}
	}

	/**
	 * 目标用户的有效权限：直挂角色 ∪ 组链绑定角色（与 loadUserById 同一套口径）。
	 *
	 * <p>
	 * 只查 t_user_role 会把「没有任何直挂角色、但所在组绑了 teacher」的老师误判成低权限，
	 * 从而允许别人重置他的密码/删除他（账号接管）。这里直接用 loadUserById 的并集结果。
	 * 注意：内部自调用不走缓存代理，拿到的一定是实时结果。
	 */
	private Set<String> loadAuthorityNames(String userId) {
		UserInfo userInfo = loadUserById(userId);
		if (userInfo == null || userInfo.getAuthorityList() == null) {
			return Collections.emptySet();
		}
		return new HashSet<>(userInfo.getAuthorityList());
	}

	private Set<String> currentAuthorityNames() {
		return SecurityContextUtils.getUser().getAuthorities().stream().map(GrantedAuthority::getAuthority)
				.collect(Collectors.toSet());
	}

	private Set<String> toAuthorityNames(Role role) {
		Set<String> authorities = new HashSet<>();
		if (StringUtils.hasText(role.getCode())) {
			authorities.add("ROLE_" + role.getCode());
		}
		if (isNotBlank(role.getAuthority())) {
			Arrays.stream(role.getAuthority().split(",")).filter(StringUtils::hasText).forEach(authorities::add);
		}
		// 超级管理员天然拥有全部权限：把权限目录里的所有串直接注进来。
		// 之前只认 t_role.authority 里存的串，结果目录新增权限（如 system:log:list）后，
		// 管理员在页面显示「全勾选」，实际调接口却被 403 挡住（/api/system/audit/list 就是例子）。
		if ("admin".equals(role.getCode())) {
			for (PermissionEnum permission : PermissionEnum.values()) {
				authorities.add(permission.getCode());
			}
		}
		return authorities;
	}

	private void evictUserAfterCommit(String userId) {
		Cache userCache = cacheManager.getCache(CacheConsts.userCacheName);
		if (userCache == null || userId == null) {
			return;
		}
		Runnable evict = () -> userCache.evictIfPresent(userId);
		if (TransactionSynchronizationManager.isActualTransactionActive()
				&& TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					evict.run();
				}
			});
		}
		else {
			evict.run();
		}
	}

	private List<String> parseImportRoleNames(String roles, Map<String, String> roleName2Id) {
		String normalizedRoles = roles.trim();
		List<String> roleNames = Arrays.stream(normalizedRoles.split("\\s*[,，、;；\\r\\n]+\\s*")).map(String::trim)
				.filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		if (roleNames.size() == 1 && normalizedRoles.matches(".*\\s+.*")
				&& !roleName2Id.containsKey(roleNames.get(0))) {
			roleNames = Arrays.stream(normalizedRoles.split("\\s+")).map(String::trim).filter(StringUtils::hasText)
					.distinct().collect(Collectors.toList());
		}
		return roleNames;
	}

	private <T> Map<String, String> buildNameIdMap(List<T> items, Function<T, String> nameGetter,
			Function<T, String> idGetter, String duplicateMessageKey) {
		Map<String, String> name2Id = new LinkedHashMap<>();
		Set<String> duplicateNames = new LinkedHashSet<>();
		items.forEach(item -> {
			String name = nameGetter.apply(item);
			if (isBlank(name)) {
				return;
			}
			String normalizedName = name.trim();
			String previousId = name2Id.putIfAbsent(normalizedName, idGetter.apply(item));
			if (previousId != null) {
				duplicateNames.add(normalizedName);
			}
		});
		if (!duplicateNames.isEmpty()) {
			throw new InternalServerError(i18n(duplicateMessageKey, duplicateNames.iterator().next()));
		}
		return name2Id;
	}

	@Override
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

	@Override
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

	@Override
	public void validateCaptcha(AuthRequest request) {
		SystemInfo systemInfo = systemService.getSystemInfo();
		if (systemInfo.getSetting() != null && Boolean.TRUE.equals(systemInfo.getSetting().getCaptchaEnabled())) {
			// 验证码已开启
			CaptchaVO captchaVO = new CaptchaVO();
			captchaVO.setCaptchaVerification(request.getCaptchaVerification());
			ResponseModel response = captchaService.verification(captchaVO);
			if (response.isSuccess() == false) {
				// 验证码校验失败，返回信息告诉前端
				// repCode 0000 无异常，代表成功
				// repCode 9999 服务器内部异常
				// repCode 0011 参数不能为空
				// repCode 6110 验证码已失效，请重新获取
				// repCode 6111 验证失败
				// repCode 6112 获取验证码失败,请联系管理员
				// repCode 6113 底图未初始化成功，请检查路径
				// repCode 6201 get接口请求次数超限，请稍后再试!
				// repCode 6206 无效请求，请重新获取验证码
				// repCode 6202 接口验证失败数过多，请稍后再试
				// repCode 6204 check接口请求次数超限，请稍后再试!
				throw new ValidationException(response.getRepMsg());
			}
		}
	}

	private Optional<String> getCellValue(Row row, int cellIndex) {
		String cellValue;
		try {
			cellValue = row.getCellText(cellIndex);
		}
		catch (Exception ex) {
			cellValue = row.getCellRawValue(cellIndex).orElse(null);
		}
		if (isBlank(cellValue)) {
			return Optional.empty();
		}
		return Optional.of(cellValue.trim());
	}

	private void validateStrongPassword(String password, Integer rowNum) {
		if (password != null && STRONG_PASSWORD_PATTERN.matcher(password).matches()) {
			return;
		}
		if (rowNum != null) {
			throw new InternalServerError(i18n("user.import.passwordWeak", rowNum));
		}
		throw new InternalServerError(i18n("user.password.strong"));
	}

	private String i18n(String key, Object... args) {
		return messageSource.getMessage(key, args, LocaleContextHolder.getLocale());
	}

}
