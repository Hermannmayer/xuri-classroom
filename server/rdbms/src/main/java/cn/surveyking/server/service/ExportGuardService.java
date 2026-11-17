package cn.surveyking.server.service;

import cn.surveyking.server.core.audit.AuditRecorder;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 导出管控：密码校验 + 审计记录。
 *
 * <p>用户明确选择用「导出密码 + 审计日志」替代数据库字段加密：
 * 加密对「能读服务器文件」的人无效，而导出才是题目外流的主要路径。
 *
 * <p>密码存在系统设置 {@code setting.exportPassword}，为空表示不启用；
 * 无论是否启用密码，具备导出权限的人导出成功都会留下一条审计记录。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExportGuardService {

	/** 动作常量 */
	public static final String EXPORT_REPO = "EXPORT_REPO";

	public static final String EXPORT_ANSWER = "EXPORT_ANSWER";

	public static final String IMPORT_REPO = "IMPORT_REPO";

	/**
	 * 审计统一走 {@link AuditRecorder}：导出这条链路和 AOP 那条链路必须用同一套口径，
	 * 否则「操作日志」里同一动作会出现一半有 source/操作人、一半没有的情况。
	 */
	private final AuditRecorder auditRecorder;

	private final cn.surveyking.server.mapper.SysInfoMapper sysInfoMapper;

	/** 一次性导出令牌：token -> 令牌信息（60 秒有效、用一次即失效、绑定用户） */
	private static final java.util.concurrent.ConcurrentHashMap<String, ExportToken> TOKENS = new java.util.concurrent.ConcurrentHashMap<>();

	private static final long TOKEN_TTL_MS = 60_000L;

	/**
	 * 校验导出密码。设置里没配密码时直接放行（仍受权限注解约束）。
	 *
	 * <p>注意：这里必须直接读 SysInfo 原始记录，不能走 {@code systemService.getSystemInfo()}——
	 * 后者为了安全会把密码置空（公开接口不回显），走它会导致密码校验永远通过。
	 */
	public void assertExportAllowed(String provided) {
		String expected = currentExportPassword();
		if (!StringUtils.hasText(expected)) {
			return;
		}
		if (!expected.equals(provided == null ? null : provided.trim())) {
			throw new cn.surveyking.server.core.exception.ErrorCodeException(
					cn.surveyking.server.core.constant.ErrorCode.ExportPasswordError);
		}
	}

	private String currentExportPassword() {
		cn.surveyking.server.domain.model.SysInfo info = sysInfoMapper.selectById("1");
		return info != null && info.getSetting() != null ? info.getSetting().getExportPassword() : null;
	}

	/**
	 * 用密码换一个一次性令牌。
	 *
	 * <p>导出是 GET 下载，如果直接把密码放 query 里，它会永久留在服务器访问日志和浏览器历史里。
	 * 改成「先换 token，再拿 token 下载」：token 60 秒过期、用一次即失效、并且绑定当前用户。
	 */
	public java.util.Map<String, Object> issueToken(String password) {
		assertExportAllowed(password);
		String token = java.util.UUID.randomUUID().toString().replace("-", "");
		TOKENS.put(token, new ExportToken(currentUser(), System.currentTimeMillis() + TOKEN_TTL_MS));
		// 顺手清掉过期令牌，避免内存里越积越多
		TOKENS.entrySet().removeIf(e -> e.getValue().expiresAt < System.currentTimeMillis());
		java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
		result.put("exportToken", token);
		result.put("expiresIn", TOKEN_TTL_MS / 1000);
		return result;
	}

	/**
	 * 校验一次性令牌：未设置导出密码时直接放行；设置后必须持有效、未过期、同用户的令牌。
	 * 令牌用一次就删除。
	 */
	public void assertTokenAllowed(String token) {
		if (!StringUtils.hasText(currentExportPassword())) {
			return;
		}
		ExportToken info = token == null ? null : TOKENS.get(token);
		if (info == null || info.expiresAt < System.currentTimeMillis()) {
			if (token != null) {
				TOKENS.remove(token);
			}
			throw new cn.surveyking.server.core.exception.ErrorCodeException(
					cn.surveyking.server.core.constant.ErrorCode.ExportPasswordError);
		}
		String user = currentUser();
		if (!user.equals(info.userId)) {
			throw new cn.surveyking.server.core.exception.ErrorCodeException(
					cn.surveyking.server.core.constant.ErrorCode.ExportPasswordError);
		}
		TOKENS.remove(token);
	}

	private static final class ExportToken {

		private final String userId;

		private final long expiresAt;

		private ExportToken(String userId, long expiresAt) {
			this.userId = userId;
			this.expiresAt = expiresAt;
		}
	}

	/** 记一条审计日志；失败不影响导出本身（AuditRecorder 内部已经吞掉异常） */
	public void record(String action, String targetId, String targetName, String detail) {
		auditRecorder.record(action, targetId, targetName, detail, true, null);
	}

	/**
	 * 记一条带「导出口径」的审计。
	 *
	 * <p>导出是只读动作，没有「改后」状态，所以把筛选范围记进 before_json：
	 * 项目 / 班级 / 第几次作答 / 请求条数 / 类型。**只记范围，不复制任何导出内容**——
	 * 审计表长期保留，把答卷正文放进去等于又开了一个数据出口。
	 * @param scope 导出口径，由各导出接口按自己关心的筛选条件拼
	 */
	public void record(String action, String targetId, String targetName, String detail, Map<String, Object> scope) {
		auditRecorder.recordWithDiff(action, targetId, targetName, detail, true, null, scope, null);
	}

	/**
	 * 答卷导出口径：只记筛选范围（项目 / 班级 / 第几次作答 / 请求条数 / 导出类型），不记任何答卷内容。
	 *
	 * <p>{@code requestedIds=0} 表示没有按 id 过滤，导出的就是该范围内全部答卷——
	 * 真实条数要到导出那一刻才知道，这里有筛选条件已经足够回答「这次带走多大范围」。
	 */
	public static Map<String, Object> answerExportScope(cn.surveyking.server.domain.dto.DownloadQuery query) {
		Map<String, Object> scope = new LinkedHashMap<>();
		if (query == null) {
			return scope;
		}
		scope.put("projectId", query.getProjectId());
		scope.put("classId", query.getClassId());
		scope.put("attemptNo", query.getAttemptNo());
		scope.put("type", query.getType() == null ? null : query.getType().name());
		scope.put("requestedIds", query.getIds() == null ? 0 : query.getIds().size());
		return scope;
	}

	/** 题库导出口径：题库 id + 名称/分类/模式（题库导出没有题目级筛选，不记条数） */
	public static Map<String, Object> repoExportScope(cn.surveyking.server.domain.dto.RepoRequest request) {
		Map<String, Object> scope = new LinkedHashMap<>();
		if (request == null) {
			return scope;
		}
		scope.put("repoId", request.getId());
		scope.put("name", request.getName());
		scope.put("category", request.getCategory());
		scope.put("mode", request.getMode());
		return scope;
	}

	/** 当前操作人（审计里 create_by 由 BaseModel 自动填充，这里仅用于日志文本） */
	public String currentUser() {
		return SecurityContextUtils.isAuthenticated() ? SecurityContextUtils.getUserId() : "anonymous";
	}

}
