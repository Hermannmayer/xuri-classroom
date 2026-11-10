package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

/**
 * 班级学员批量导入请求（multipart/form-data）。
 *
 * <p>模板第 1 行是表头，数据列依次为：0 姓名（必填）、1 手机号（必填，同时作为登录账号）、
 * 2 初始密码（可空，默认 12345678）、3 邮箱（可空）。
 */
@Data
public class ClassMemberImportRequest {

	/** 目标班级 id，必填；调用者必须对该班有「可管理」权限 */
	private String deptId;

	/** Excel 文件（xlsx），由 ExcelImportSecurity 做体积与结构检查 */
	private MultipartFile file;

}
