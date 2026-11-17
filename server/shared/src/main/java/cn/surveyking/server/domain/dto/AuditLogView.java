package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/**
 * 操作日志的展示视图：在 {@code t_audit_log} 原始字段上补三样人看得懂的东西：
 * 动作中文名、目标名称、操作人姓名。
 *
 * <p>原始 {@code action} / {@code targetId} / {@code createBy} 仍然保留，
 * 字典没收录的新动作、对象已删除、账号已删除时前端可以回退显示原始值。
 *
 * @author backend-ops
 */
@Data
public class AuditLogView {

	private String id;

	/** 原始动作码，如 SYSTEM_DEPT_DELETE */
	private String action;

	/** 动作中文名，如「删除用户组」；未收录时回退 action */
	private String actionName;

	/** 目标 id */
	private String targetId;

	/** 目标名称（组名/用户名/考试名…），解析不到时为 null */
	private String targetName;

	private String detail;

	/**
	 * 改前快照（JSON 文本，仅高危动作有）：管理员在「操作日志」页要能看到
	 * 「8 分改成 10 分」「权限串前后」这类差异，否则 2.2.3 存的快照只有时间线接口能看到。
	 * 超长时是被截断后的 JSON 外壳（{@code _truncated/_bytes/_preview}）。
	 */
	private String beforeJson;

	/** 改后快照（JSON 文本，仅高危动作有） */
	private String afterJson;

	/** 来源：web / mcp / api */
	private String source;

	/** 同一次请求的关联 id（X-Request-Id / MDC），可空 */
	private String requestId;

	private String ip;

	/** 操作人 id（原始 create_by） */
	private String createBy;

	/** 操作人姓名，账号已被删除或取不到时为 null */
	private String operatorName;

	private Date createAt;

}
