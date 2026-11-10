package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.AppConsts;
import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.core.uitls.ExcelImportSecurity;
import cn.surveyking.server.domain.dto.ClassMemberImportResult;
import cn.surveyking.server.domain.dto.UserRequest;
import cn.surveyking.server.domain.model.Account;
import cn.surveyking.server.mapper.AccountMapper;
import cn.surveyking.server.service.UserService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.ValidationException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 班级学员 Excel 批量导入。
 *
 * <p>模板只有一张表：第 1 行表头，数据列依次是 0 姓名（必填）、1 手机号（必填，同时是登录账号）、
 * 2 初始密码（可空，默认 12345678）、3 邮箱（可空）。逐行校验后调用
 * {@link UserService#createClassStudent(UserRequest)} 建号，角色/状态/组的安全校验与手工建号完全一致。
 *
 * <p>事务由调用方 {@code ClassServiceImpl#importClassMembers} 开启（{@code @Transactional(rollbackFor =
 * Exception.class)}）：任一行失败整批回滚，异常信息统一成「第 N 行：原因」。本组件刻意不依赖
 * {@code ClassServiceImpl}（只依赖 {@link UserService}），避免构造器循环依赖；「能不能管理这个班」由调用方
 * 在进入导入之前用 {@code assertClassManage} 判定。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClassStudentImportService {

	/** 初始密码留空时的默认值，与用户导入保持一致 */
	private static final String DEFAULT_PASSWORD = "12345678";

	/** 初始密码长度口径与 UserAdminService#validateStrongPassword 一致（8~32 位） */
	private static final int MIN_PASSWORD_LENGTH = 8;

	private static final int MAX_PASSWORD_LENGTH = 32;

	private static final int COL_NAME = 0;

	private static final int COL_PHONE = 1;

	private static final int COL_PASSWORD = 2;

	private static final int COL_EMAIL = 3;

	private static final Pattern INTEGER_LIKE = Pattern.compile("^\\d+\\.0+$");

	private static final Pattern SCIENTIFIC_LIKE = Pattern.compile("^\\d+(\\.\\d+)?[Ee]\\+?\\d+$");

	private final UserService userService;

	private final AccountMapper accountMapper;

	/**
	 * 导入一个 Excel 的学员到指定班级。
	 * @param deptId 目标班级（调用方已经校验过管理权限与班级存在）
	 * @param file 模板文件
	 * @return 成功建号的行数
	 */
	public ClassMemberImportResult importMembers(String deptId, MultipartFile file) {
		if (!StringUtils.hasText(deptId)) {
			throw new ValidationException("缺少班级 id");
		}
		if (file == null || file.isEmpty()) {
			throw new ValidationException("请选择要导入的 Excel 文件");
		}
		ExcelImportSecurity.validateFile(file);
		try {
			return doImport(deptId, file);
		}
		catch (ValidationException | AccessDeniedException e) {
			throw e;
		}
		catch (Exception e) {
			// 文件损坏 / 不是 xlsx：不要让用户看到「服务出了点问题」
			log.error("班级学员导入解析失败 deptId={}", deptId, e);
			throw new ValidationException("Excel 文件解析失败，请确认使用模板且文件未损坏");
		}
	}

	@SneakyThrows
	private ClassMemberImportResult doImport(String deptId, MultipartFile file) {
		ExcelImportSecurity.RowGuard rowGuard = ExcelImportSecurity.newRowGuard();
		// 手机上已存在的登录账号一次性取出来：逐行查 t_account 会变成 N 次全表扫描
		Set<String> existingPhones = loadExistingPhones();
		Set<String> seenPhones = new HashSet<>();
		int[] imported = { 0 };
		try (InputStream is = file.getInputStream(); ReadableWorkbook workbook = new ReadableWorkbook(is)) {
			Sheet sheet = workbook.getFirstSheet();
			try (Stream<Row> rows = sheet.openStream()) {
				rows.forEach(row -> {
					rowGuard.validate(row);
					// 第 1 行是表头
					if (row.getRowNum() == 1) {
						return;
					}
					int rowNum = row.getRowNum();
					String name = getCellText(row, COL_NAME);
					String phone = normalizePhoneCell(getCellText(row, COL_PHONE));
					String passwordCell = normalizeNumberCell(getCellText(row, COL_PASSWORD));
					String email = getCellText(row, COL_EMAIL);
					// 整行空白（Excel 常见的尾部空行）直接跳过，不报错
					if (!StringUtils.hasText(name) && !StringUtils.hasText(phone) && !StringUtils.hasText(passwordCell)
							&& !StringUtils.hasText(email)) {
						return;
					}
					if (!StringUtils.hasText(name)) {
						throw rowError(rowNum, "学员姓名不能为空");
					}
					if (!StringUtils.hasText(phone)) {
						throw rowError(rowNum, "手机号不能为空");
					}
					if (!ClassStudentService.PHONE_PATTERN.matcher(phone).matches()) {
						throw rowError(rowNum, "手机号格式不正确");
					}
					if (!seenPhones.add(phone)) {
						throw rowError(rowNum, "手机号在文件中重复");
					}
					if (existingPhones.contains(phone)) {
						throw rowError(rowNum, ClassStudentService.PHONE_EXISTS_MESSAGE);
					}
					String password = StringUtils.hasText(passwordCell) ? passwordCell : DEFAULT_PASSWORD;
					if (password.length() < MIN_PASSWORD_LENGTH || password.length() > MAX_PASSWORD_LENGTH) {
						throw rowError(rowNum, "初始密码需为 " + MIN_PASSWORD_LENGTH + "~" + MAX_PASSWORD_LENGTH + " 位");
					}
					UserRequest userRequest = new UserRequest();
					userRequest.setName(name);
					userRequest.setPhone(phone);
					// 登录账号 = 手机号（ClassStudentService 也会再强制一次）
					userRequest.setUsername(phone);
					userRequest.setPassword(password);
					userRequest.setEmail(email);
					userRequest.setDeptId(deptId);
					userRequest.setDeptIds(Collections.emptyList());
					try {
						userService.createClassStudent(userRequest);
					}
					catch (AccessDeniedException e) {
						// 权限类异常不能被改写成「第 N 行解析失败」，否则用户根本看不出是权限不足
						throw e;
					}
					catch (DuplicateKeyException e) {
						throw rowError(rowNum, ClassStudentService.PHONE_EXISTS_MESSAGE);
					}
					catch (ValidationException | InternalServerError e) {
						throw rowError(rowNum, e.getMessage());
					}
					catch (Exception e) {
						log.error("班级学员导入第 {} 行失败 deptId={}", rowNum, deptId, e);
						throw rowError(rowNum, "导入失败，请检查该行数据后重试");
					}
					imported[0]++;
				});
			}
		}
		ClassMemberImportResult result = new ClassMemberImportResult();
		result.setImported(imported[0]);
		return result;
	}

	/** 全部 PWD 登录账号，用于「手机号已被其他账号使用」的批量判重 */
	private Set<String> loadExistingPhones() {
		return accountMapper
				.selectList(Wrappers.<Account>lambdaQuery().select(Account::getAuthAccount)
						.eq(Account::getAuthType, AppConsts.AUTH_TYPE.PWD.name()))
				.stream().map(Account::getAuthAccount).filter(StringUtils::hasText).collect(Collectors.toSet());
	}

	private ValidationException rowError(int rowNum, String message) {
		return new ValidationException("第 " + rowNum + " 行：" + message);
	}

	/** 单元格文本；取不到（越界 / 公式异常）时退回原始值，空值返回 null */
	private String getCellText(Row row, int cellIndex) {
		String cellValue;
		try {
			cellValue = row.getCellText(cellIndex);
		}
		catch (Exception ex) {
			cellValue = row.getCellRawValue(cellIndex).orElse(null);
		}
		if (!StringUtils.hasText(cellValue)) {
			return null;
		}
		return cellValue.trim();
	}

	/** 手机号列：去掉空格/横线，并还原被 Excel 存成数字的格式 */
	private String normalizePhoneCell(String value) {
		if (value == null) {
			return null;
		}
		return normalizeNumberCell(value.replaceAll("[\\s-]", ""));
	}

	/**
	 * 手机号/初始密码在 Excel 里被当成「数字」时，读出来可能带小数位或科学计数法
	 * （{@code 13800138000.0}、{@code 1.3800138E10}）。只在形如数字时还原成整数字面量，其它原样返回。
	 */
	private String normalizeNumberCell(String value) {
		if (!StringUtils.hasText(value)) {
			return value;
		}
		String text = value.trim();
		if (!INTEGER_LIKE.matcher(text).matches() && !SCIENTIFIC_LIKE.matcher(text).matches()) {
			return text;
		}
		try {
			return new BigDecimal(text).stripTrailingZeros().toPlainString();
		}
		catch (NumberFormatException ex) {
			return text;
		}
	}

}
