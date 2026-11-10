package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.security.PasswordEncoder;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.UserRequest;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.DeptRole;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.domain.model.UserRole;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.mapper.DeptRoleMapper;
import cn.surveyking.server.mapper.UserDeptMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.mapper.UserRoleMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import javax.validation.ValidationException;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

/**
 * 班级学员：班主任视角的建号 / 改号 / 删号。
 *
 * <p>
 * 从 {@code UserServiceImpl} 切出的班级块。入口权限由 {@code class:member:*} 控制，
 * 这里只做「只碰学员账号、不改角色与组」的兜底校验；建号复用
 * {@link UserAdminService#createUser(UserRequest, boolean)}（不校验组绑定角色，由
 * {@code assertClassDeptRoleSafe} 单独把关）。
 *
 * <p>
 * 学员的登录账号就是手机号：建号时服务端强制 {@code username = phone}（不信任前端传来的
 * username），改号时手机号变化要同步 {@code t_account.auth_account}，否则学员改完手机号还能用
 * 旧号码登录。
 */
@Component
@RequiredArgsConstructor
public class ClassStudentService {

	/** 学员登录账号 = 手机号，11 位大陆手机号，与前端/接口契约保持同一份正则 */
	public static final Pattern PHONE_PATTERN = Pattern.compile("^1[3-9]\\d{9}$");

	/** 手机号重复时的统一提示：建号、导入、改号三处口径一致 */
	public static final String PHONE_EXISTS_MESSAGE = "该手机号已被其他账号使用";

	private final UserMapper userMapper;

	private final DeptMapper deptMapper;

	private final AccountMapper accountMapper;

	private final UserDeptMapper userDeptMapper;

	private final UserRoleMapper userRoleMapper;

	private final DeptRoleMapper deptRoleMapper;

	private final RoleServiceImpl roleService;

	private final PasswordEncoder passwordEncoder;

	private final UserDeptMembershipService deptService;

	private final UserAdminService userAdminService;

	private final UserAuthService userAuthService;

	/**
	 * 班级管理里由班主任新增学员：角色固定成系统内置学员角色，不接受请求方指定角色。
	 *
	 * <p>不走 {@link #assertRoleGrantScope}：老师没有学员的 portal:student / repo:practice 等权限串，
	 * 但这不代表不能在自己班里建学员；入口由 class:member:create 控制，班级可见性由 ClassService 校验。
	 *
	 * <p>登录账号强制取手机号：前端就算传了 username 也一律覆盖，避免出现「账号是姓名、手机号是另一个」
	 * 这种只有前端约定、后端没兜住的口径。
	 */
	public void createClassStudent(UserRequest request) {
		if (request == null) {
			throw new ValidationException("缺少学员信息");
		}
		String phone = normalizePhone(request.getPhone());
		request.setPhone(phone);
		request.setUsername(phone);
		// 学员只能进班级：UserAdminService 里还有一层同样的校验，这里先给出班级场景的提示
		assertStudentDeptIsClass(request.getDeptId());
		userAdminService.validateStrongPassword(request.getPassword(), null);
		Role studentRole = roleService
				.list(Wrappers.<Role>lambdaQuery().in(Role::getCode, "student", "xueyuan")
						.eq(Role::getStatus, AppConsts.USER_STATUS.VALID).orderByAsc(Role::getCreateAt))
				.stream().findFirst()
				.orElseThrow(() -> new ValidationException("系统里没有可用的学员角色，请联系管理员"));
		request.setRoles(Collections.singletonList(studentRole.getId()));
		request.setStatus(AppConsts.USER_STATUS.VALID);
		request.setUserType("student");
		assertClassDeptRoleSafe(request.getDeptId(), studentRole);
		userAdminService.createUser(request, false);
	}

	/**
	 * 班级管理里删除学员：调用方（ClassService）已经校验过班级可见性与「目标是学员」，
	 * 这里不再走 system:user:delete 的 manage 校验，但仍然清账号、附加组与角色绑定。
	 */
	public void deleteClassStudent(String userId) {
		User user = userMapper.selectById(userId);
		if (user == null || !"student".equals(user.getUserType())) {
			throw new AccessDeniedException("只能删除学员账号");
		}
		userMapper.deleteById(userId);
		accountMapper.physicallyDeleteExternalByUserId(userId);
		accountMapper.delete(Wrappers.<Account>lambdaQuery().eq(Account::getUserId, userId));
		userDeptMapper.deleteByUserId(userId);
		userRoleMapper.delete(Wrappers.<UserRole>lambdaQuery().eq(UserRole::getUserId, userId));
		userAdminService.evictUserAfterCommit(userId);
	}

	/**
	 * 班级管理里编辑学员：只允许改姓名、手机、邮箱、状态与重置密码；
	 * 不允许改角色/所属组（防提权），也不走 system:user:update 的 manage 校验。
	 *
	 * <p>手机号是登录账号，改号时同步改 {@code t_account.auth_account}（auth_type=PWD）：
	 * 先做唯一性校验，账号行不存在直接报错，避免「界面显示改成功、人还是用旧号登录」。
	 */
	public void updateClassStudent(UserRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			throw new ValidationException("缺少学员 id");
		}
		User current = userMapper.selectById(request.getId());
		if (current == null || !"student".equals(current.getUserType())) {
			throw new AccessDeniedException("只能编辑学员账号");
		}
		String phone = normalizePhone(request.getPhone());
		boolean phoneChanged = !phone.equals(current.getPhone() == null ? null : current.getPhone().trim());
		Account account = null;
		if (phoneChanged || request.getStatus() != null || isNotBlank(request.getPassword())) {
			account = accountMapper.selectOne(Wrappers.<Account>lambdaQuery()
					.eq(Account::getUserId, request.getId()).eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()));
		}
		if (phoneChanged) {
			if (account == null) {
				throw new ValidationException("该学员的登录账号不存在，请联系管理员处理");
			}
			if (!phone.equals(account.getAuthAccount())) {
				if (countPwdAccountByPhone(phone, request.getId()) > 0) {
					throw new ValidationException(PHONE_EXISTS_MESSAGE);
				}
				account.setAuthAccount(phone);
			}
		}
		User update = new User();
		update.setId(request.getId());
		update.setName(request.getName());
		update.setPhone(phone);
		update.setEmail(request.getEmail());
		update.setStatus(request.getStatus());
		userMapper.updateById(update);
		if (account != null) {
			if (request.getStatus() != null) {
				account.setStatus(request.getStatus());
			}
			if (isNotBlank(request.getPassword())) {
				userAdminService.validateStrongPassword(request.getPassword(), null);
				account.setAuthSecret(passwordEncoder.encode(request.getPassword()));
			}
			accountMapper.updateById(account);
		}
		userAdminService.evictUserAfterCommit(request.getId());
	}

	/**
	 * 目标节点必须是班级（dept_type=class）：用户组是教职工的组织，学员不该混进去。
	 * 没传 deptId 时跳过（允许未分组学员），传了就必须存在且是班级。
	 */
	private void assertStudentDeptIsClass(String deptId) {
		if (!StringUtils.hasText(deptId)) {
			return;
		}
		Dept dept = deptMapper.selectById(deptId);
		if (dept == null) {
			throw new ValidationException("班级不存在");
		}
		if (!Dept.TYPE_CLASS.equals(dept.getDeptType())) {
			throw new ValidationException("只能把学员加入班级");
		}
	}

	/** 手机号必填 + 格式校验，返回去掉首尾空白的手机号 */
	private String normalizePhone(String phone) {
		String value = phone == null ? null : phone.trim();
		if (!StringUtils.hasText(value)) {
			throw new ValidationException("请填写手机号");
		}
		if (!PHONE_PATTERN.matcher(value).matches()) {
			throw new ValidationException("手机号格式不正确");
		}
		return value;
	}

	/** 同一个手机号是否已被别的账号（auth_type=PWD）占用 */
	private long countPwdAccountByPhone(String phone, String excludeUserId) {
		return accountMapper.selectCount(
				Wrappers.<Account>lambdaQuery().eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name())
						.eq(Account::getAuthAccount, phone)
						.ne(StringUtils.hasText(excludeUserId), Account::getUserId, excludeUserId));
	}

	/**
	 * 班级建学员时不能跳过「组绑定角色」的风险：把用户放进某个组会连带继承该组（含祖先链）的角色。
	 *
	 * <p>这里不允许目标组链绑定任何高于「学员角色」的角色；学员角色本身或权限是它子集的角色放行。
	 * 这样班主任能往普通班级加学员，但不能借班级配置提权。
	 */
	private void assertClassDeptRoleSafe(String deptId, Role studentRole) {
		if (SecurityContextUtils.isAdmin() || !StringUtils.hasText(deptId)) {
			return;
		}
		List<String> chain = deptService.resolveDeptChainIds(Collections.singletonList(deptId), deptService.loadDeptMap());
		if (CollectionUtils.isEmpty(chain)) {
			return;
		}
		List<String> roleIds = deptRoleMapper
				.selectList(Wrappers.<DeptRole>lambdaQuery().in(DeptRole::getDeptId, chain)).stream()
				.map(DeptRole::getRoleId).filter(StringUtils::hasText).distinct().collect(Collectors.toList());
		if (roleIds.isEmpty()) {
			return;
		}
		Set<String> studentAuthorities = userAuthService.toAuthorityNames(studentRole);
		for (Role role : roleService.listByIds(roleIds)) {
			if (role == null || !Objects.equals(role.getStatus(), AppConsts.USER_STATUS.VALID)) {
				continue;
			}
			if (Objects.equals(role.getCode(), "student") || Objects.equals(role.getCode(), "xueyuan")) {
				continue;
			}
			if (!studentAuthorities.containsAll(userAuthService.toAuthorityNames(role))) {
				throw new AccessDeniedException("不能把学员放进绑定了更高权限角色的用户组");
			}
		}
	}

}
