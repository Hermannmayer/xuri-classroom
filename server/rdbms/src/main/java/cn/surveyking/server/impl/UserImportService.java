package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.ExcelImportSecurity;
import cn.surveyking.server.core.uitls.PinyinUtils;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.UserRequest;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.domain.model.Dept;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.mapper.DeptMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.io.InputStream;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.commons.lang3.StringUtils.isBlank;

/**
 * 用户批量导入（Excel）。
 *
 * <p>
 * 从 {@code UserServiceImpl} 切出的导入块，方法体逐行搬运。建号仍然走
 * {@link UserAdminService#createUser(UserRequest)}，权限校验仍然走 {@link UserPermissionGuard}，
 * 因此导入路径与手工建号的校验口径完全一致。
 */
@Component
@RequiredArgsConstructor
public class UserImportService {

	private final RoleServiceImpl roleService;

	private final DeptMapper deptMapper;

	private final AccountMapper accountMapper;

	private final UserAdminService userAdminService;

	private final UserPermissionGuard permissionGuard;

	private final UserAuthService userAuthService;

	@SneakyThrows
	public void importUser(UserRequest request) {
		if (!SecurityContextUtils.hasAuthority("system:user:create")) {
			throw new AccessDeniedException("无权限导入用户");
		}
		if (request.getFile() == null || request.getFile().isEmpty()) {
			throw new InternalServerError(userAuthService.i18n("user.import.fileRequired"));
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
							throw new InternalServerError(userAuthService.i18n("user.import.usernameExists", rowNum[0]));
						}
						if (!usernameSet.add(userRequest.getUsername())) {
							throw new InternalServerError(userAuthService.i18n("user.import.usernameDuplicate", rowNum[0]));
						}
						// 密码列可以留空，留空时用默认密码 12345678，学员首次登录后自行修改
						String password = getCellValue(r, 2).orElse("12345678");
						userAdminService.validateStrongPassword(password, rowNum[0]);
						userRequest.setPassword(password);
						userRequest.setStatus(AppConsts.USER_STATUS.VALID);
						// 用户管理里的批量导入是教职工入口；学员导入不在这个页面
						userRequest.setUserType("staff");
						userRequest.setPhone(getCellValue(r, 3).orElse(null));
						userRequest.setEmail(getCellValue(r, 4).orElse(null));
						String deptName = getCellValue(r, 5).orElse(null);
						if (deptName != null) {
							String deptId = deptName2Id.get(deptName);
							if (deptId == null) {
								throw new InternalServerError(userAuthService.i18n("user.import.deptNotFound", rowNum[0], deptName));
							}
							userRequest.setDeptId(deptId);
						}
						String roles = getCellValue(r, 6).orElse(null);
						if (roles != null) {
							List<String> roleNames = parseImportRoleNames(roles, roleName2Id);
							if (CollectionUtils.isEmpty(roleNames)) {
								throw new InternalServerError(userAuthService.i18n("user.import.roleNotFound", rowNum[0], roles));
							}
							List<String> missingRoleNames = roleNames.stream()
									.filter(roleName -> !roleName2Id.containsKey(roleName))
									.collect(Collectors.toList());
							if (!CollectionUtils.isEmpty(missingRoleNames)) {
								throw new InternalServerError(userAuthService.i18n("user.import.roleNotFound", rowNum[0],
										String.join("、", missingRoleNames)));
							}
							List<String> roleIds = roleNames.stream().map(roleName2Id::get).distinct()
									.collect(Collectors.toList());
							permissionGuard.assertGrantableRoles(roleIds);
							// 导入是「批量建用户」的入口：每行角色同样要过学员/老师两档校验
							permissionGuard.assertRoleGrantScope(roleIds);
							userRequest.setRoles(roleIds);
						}
						userAdminService.createUser(userRequest);
					});
				}
				catch (Exception e) {
					if (e instanceof InternalServerError) {
						throw (InternalServerError) e;
					}
					// 权限类异常不能被改写成「第 N 行解析失败」：否则学员档账号导入老师角色时，
					// 看到的是文件格式错误，根本不知道是权限不足。原样抛给上层（会回滚整批）。
					if (e instanceof AccessDeniedException) {
						throw (AccessDeniedException) e;
					}
					if (e instanceof ErrorCodeException) {
						throw (ErrorCodeException) e;
					}
					if (e instanceof DuplicateKeyException) {
						throw new InternalServerError(userAuthService.i18n("user.import.userExists", rowNum[0]), e);
					}
					throw new InternalServerError(userAuthService.i18n("user.import.parseError", rowNum[0]), e);
				}
			});
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
			throw new InternalServerError(userAuthService.i18n(duplicateMessageKey, duplicateNames.iterator().next()));
		}
		return name2Id;
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

}
