package cn.surveyking.server.service;

import cn.surveyking.server.core.audit.AuditRecorder;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;










@Slf4j
@Service
@RequiredArgsConstructor
public class ExportGuardService {


	public static final String EXPORT_REPO = "EXPORT_REPO";

	public static final String EXPORT_ANSWER = "EXPORT_ANSWER";

	public static final String EXPORT_PROJECT = "EXPORT_PROJECT";

	public static final String EXPORT_BACKUP = "EXPORT_BACKUP";

	public static final String RESTORE_BACKUP = "RESTORE_BACKUP";

	public static final String IMPORT_REPO = "IMPORT_REPO";





	private final AuditRecorder auditRecorder;

	private final cn.surveyking.server.mapper.SysInfoMapper sysInfoMapper;


	private static final java.util.concurrent.ConcurrentHashMap<String, ExportToken> TOKENS = new java.util.concurrent.ConcurrentHashMap<>();

	private static final long TOKEN_TTL_MS = 60_000L;

	/** 校验导出密码 */
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

	/** 用密码换一个一次性令牌 */
	public java.util.Map<String, Object> issueToken(String password) {
		assertExportAllowed(password);
		String token = java.util.UUID.randomUUID().toString().replace("-", "");
		TOKENS.put(token, new ExportToken(currentUser(), System.currentTimeMillis() + TOKEN_TTL_MS));

		TOKENS.entrySet().removeIf(e -> e.getValue().expiresAt < System.currentTimeMillis());
		java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
		result.put("exportToken", token);
		result.put("expiresIn", TOKEN_TTL_MS / 1000);
		return result;
	}

	/** 校验一次性令牌：未设置导出密码时直接放行；设置后必须持有效、未过期、同用户的令牌 */
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

	/** 记一条带「导出口径」的审计 */
	public void record(String action, String targetId, String targetName, String detail, Map<String, Object> scope) {
		auditRecorder.recordWithDiff(action, targetId, targetName, detail, true, null, scope, null);
	}

	/** 答卷导出口径：只记筛选范围（项目 / 班级 / 第几次作答 / 请求条数 / 导出类型），不记任何答卷内容 */
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
