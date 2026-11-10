package cn.surveyking.server.core.audit;

import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * 操作日志「动作码 → 中文名」字典。
 *
 * <p>动作码由 {@link AuditRecorder#actionOf(String)} 从 URI 生成（如
 * {@code /api/system/dept/delete → SYSTEM_DEPT_DELETE}），少量是代码里手写的固定码
 * （{@code AUTH_LOGIN}、{@code EXPORT_REPO}…）。这里只负责展示，不参与权限判定：
 *
 * <ul>
 * <li>常用动作走 {@link #EXACT}，保证中文准确、可读；</li>
 * <li>新接口没来得及收录时按 {@code _} 拆 token 翻译，至少要能看出「哪个域 + 哪个动作」；</li>
 * <li>完全翻译不了就回退原始动作码，绝不返回空白。</li>
 * </ul>
 *
 * @author backend-ops
 */
public final class AuditActionCatalog {

	private static final Map<String, String> EXACT = buildExact();

	private static final Map<String, String> TOKENS = buildTokens();

	private AuditActionCatalog() {
	}

	/**
	 * 动作码转中文名；未收录时按 token 兜底翻译，再不行回退原码。
	 */
	public static String nameOf(String action) {
		if (!StringUtils.hasText(action)) {
			return action;
		}
		String code = action.trim();
		String exact = EXACT.get(code.toUpperCase(Locale.ROOT));
		if (exact != null) {
			return exact;
		}
		StringBuilder translated = new StringBuilder();
		boolean anyTranslated = false;
		for (String token : code.toUpperCase(Locale.ROOT).split("_")) {
			if (!StringUtils.hasText(token)) {
				continue;
			}
			String name = TOKENS.get(token);
			if (name != null) {
				translated.append(name);
				anyTranslated = true;
			}
			else {
				translated.append(token);
			}
		}
		return anyTranslated ? translated.toString() : code;
	}

	private static Map<String, String> buildExact() {
		Map<String, String> map = new LinkedHashMap<>();
		// 登录（不走切面，UserApi 手写记录）
		map.put("AUTH_LOGIN", "登录成功");
		map.put("AUTH_LOGIN_FAILED", "登录失败");
		// 系统设置
		map.put("SYSTEM_UPDATE", "修改系统设置");
		map.put("SYSTEM_OAUTHSETTING", "修改第三方登录设置");
		map.put("SYSTEM_PROTECTION", "修改内容保护设置");
		// 角色
		map.put("SYSTEM_ROLE_CREATE", "新增角色");
		map.put("SYSTEM_ROLE_UPDATE", "修改角色");
		map.put("SYSTEM_ROLE_DELETE", "删除角色");
		// 用户
		map.put("SYSTEM_USER_CREATE", "新增用户");
		map.put("SYSTEM_USER_UPDATE", "修改用户");
		map.put("SYSTEM_USER_UPDATEPOSITION", "修改用户岗位");
		map.put("SYSTEM_USER_DELETE", "删除用户");
		map.put("IMPORTUSER", "导入用户");
		map.put("USER", "修改个人资料");
		map.put("USER_UI_ZOOM", "修改界面缩放");
		map.put("USER_UI_THEME", "切换主题");
		// 用户组 / 班级
		map.put("SYSTEM_DEPT_CREATE", "新增用户组");
		map.put("SYSTEM_DEPT_UPDATE", "修改用户组");
		map.put("SYSTEM_DEPT_DELETE", "删除用户组");
		map.put("SYSTEM_DEPT_SORT", "调整用户组排序");
		map.put("TEACHING_CLASSES_PARTNER_CREATE", "分配班级老师");
		map.put("TEACHING_CLASSES_PARTNER_UPDATE", "修改班级老师授权");
		map.put("TEACHING_CLASSES_PARTNER_DELETE", "取消班级老师授权");
		map.put("TEACHING_CLASSES_MEMBER_CREATE", "新增班级学员");
		map.put("TEACHING_CLASSES_MEMBER_UPDATE", "修改班级学员");
		map.put("TEACHING_CLASSES_MEMBER_DELETE", "删除班级学员");
		map.put("TEACHING_CLASSES_MEMBER_IMPORT", "导入班级学员");
		// 岗位 / 字典
		map.put("SYSTEM_POSITION_CREATE", "新增岗位");
		map.put("SYSTEM_POSITION_UPDATE", "修改岗位");
		map.put("SYSTEM_POSITION_DELETE", "删除岗位");
		map.put("SYSTEM_DICT_CREATE", "新增字典");
		map.put("SYSTEM_DICT_UPDATE", "修改字典");
		map.put("SYSTEM_DICT_DELETE", "删除字典");
		map.put("SYSTEM_DICTITEM_CREATE", "新增字典项");
		map.put("SYSTEM_DICTITEM_UPDATE", "修改字典项");
		map.put("SYSTEM_DICTITEM_DELETE", "删除字典项");
		map.put("SYSTEM_DICTITEM_IMPORT", "导入字典项");
		// 文件 / 模板
		map.put("FILE_CREATE", "上传文件");
		map.put("FILE_DELETE", "删除文件");
		map.put("TEMPLATE_CREATE", "新增题目模板");
		map.put("TEMPLATE_UPDATE", "修改题目模板");
		map.put("TEMPLATE_DELETE", "删除题目模板");
		// 题库
		map.put("REPO_CREATE", "新增题库");
		map.put("REPO_UPDATE", "修改题库");
		map.put("REPO_DELETE", "删除题库");
		map.put("REPO_PARTNER_CREATE", "授权题库");
		map.put("REPO_PARTNER_DELETE", "取消题库授权");
		map.put("REPO_BATCHCREATE", "批量添加题目");
		map.put("REPO_UNBIND", "批量移除题目");
		map.put("REPO_PICK", "从题库选题");
		map.put("REPO_IMPORT", "导入题库");
		map.put("REPO_BOOK_CREATE", "新增错题本记录");
		map.put("REPO_BOOK_UPDATE", "修改错题本记录");
		map.put("REPO_BOOK_DELETE", "删除错题本记录");
		map.put("REPO_EXPORT_TOKEN", "获取导出令牌");
		map.put("EXPORT_REPO", "导出题库");
		map.put("IMPORT_REPO", "导入题库");
		// 考试
		map.put("PROJECT_CREATE", "新增考试");
		map.put("PROJECT_UPDATE", "修改考试");
		map.put("PROJECT_STATUS", "发布 / 停止考试");
		map.put("PROJECT_DELETE", "删除考试");
		map.put("PROJECT_DESTROY", "彻底删除考试");
		map.put("PROJECT_RESTORE", "恢复考试");
		map.put("PROJECT_PARTNER_CREATE", "分配考试协作者");
		map.put("PROJECT_PARTNER_DELETE", "取消考试协作者");
		map.put("PROJECT_PARTNER_IMPORT", "导入考试协作者");
		map.put("PROJECT_SELECTUSER", "查询用户候选");
		map.put("PROJECT_SELECTDEPT", "查询用户组候选");
		map.put("PROJECT_SELECTROLE", "查询角色候选");
		map.put("PROJECT_SELECTPOSITION", "查询岗位候选");
		map.put("PROJECT_SELECTDICT", "查询字典候选");
		map.put("PROJECT_SELECTTEMPLATE", "查询模板候选");
		map.put("PROJECT_SELECTREPO", "查询题库候选");
		map.put("PROJECT_SELECTTAG", "查询标签候选");
		// 答卷 / 练习 / 报表
		map.put("ANSWER_CREATE", "新增答卷");
		map.put("ANSWER_UPDATE", "修改答卷");
		map.put("ANSWER_DELETE", "删除答卷");
		map.put("ANSWER_DESTROY", "彻底删除答卷");
		map.put("ANSWER_RESTORE", "恢复答卷");
		map.put("ANSWER_UPLOAD", "上传答卷附件");
		map.put("EXPORT_ANSWER", "导出答卷");
		map.put("EXERCISE_DELETE", "删除练习记录");
		map.put("REPORT_STATISTICS", "生成统计报表");
		return Collections.unmodifiableMap(map);
	}

	private static Map<String, String> buildTokens() {
		Map<String, String> map = new LinkedHashMap<>();
		map.put("SYSTEM", "系统");
		map.put("USER", "用户");
		map.put("USERS", "用户");
		map.put("IMPORTUSER", "导入用户");
		map.put("DEPT", "用户组");
		map.put("ROLE", "角色");
		map.put("ROLES", "角色");
		map.put("POSITION", "岗位");
		map.put("DICT", "字典");
		map.put("DICTITEM", "字典项");
		map.put("PERMISSION", "权限");
		map.put("AUDIT", "操作日志");
		map.put("LOG", "日志");
		map.put("AUTH", "登录");
		map.put("LOGIN", "登录");
		map.put("LOGOUT", "退出");
		map.put("REGISTER", "注册");
		map.put("PROJECT", "考试");
		map.put("PROJECTS", "考试");
		map.put("REPO", "题库");
		map.put("ANSWER", "答卷");
		map.put("QUESTION", "题目");
		map.put("TEMPLATE", "模板");
		map.put("CLASS", "班级");
		map.put("CLASSES", "班级");
		map.put("TEACHING", "教学");
		map.put("PARTNER", "协作");
		map.put("MEMBER", "成员");
		map.put("FILE", "文件");
		map.put("BOOK", "练习册");
		map.put("IMPORT", "导入");
		map.put("EXPORT", "导出");
		map.put("CREATE", "新增");
		map.put("UPDATE", "修改");
		map.put("DELETE", "删除");
		map.put("DESTROY", "彻底删除");
		map.put("RESTORE", "恢复");
		map.put("SORT", "排序");
		map.put("STATUS", "状态");
		map.put("LIST", "列表");
		map.put("UPLOAD", "上传");
		map.put("PICK", "选题");
		map.put("UNBIND", "解绑");
		map.put("BATCHCREATE", "批量添加");
		map.put("SELECTUSER", "选择用户");
		map.put("SELECTDEPT", "选择用户组");
		map.put("SELECTROLE", "选择角色");
		map.put("SELECTPOSITION", "选择岗位");
		map.put("SELECTDICT", "选择字典");
		map.put("SELECTTEMPLATE", "选择模板");
		map.put("SELECTREPO", "选择题库");
		map.put("SELECTTAG", "选择标签");
		map.put("STATISTICS", "统计");
		map.put("PROTECTION", "内容保护");
		map.put("OAUTHSETTING", "第三方登录设置");
		map.put("OAUTH", "第三方登录");
		map.put("WECHAT", "微信");
		map.put("SURVEY", "问卷");
		map.put("BIND", "绑定");
		map.put("START", "开始");
		map.put("TOKEN", "令牌");
		map.put("UI", "界面");
		map.put("ZOOM", "缩放");
		map.put("THEME", "主题");
		map.put("EXERCISE", "练习");
		map.put("REPORT", "报表");
		map.put("DASHBOARD", "看板");
		return Collections.unmodifiableMap(map);
	}

}
