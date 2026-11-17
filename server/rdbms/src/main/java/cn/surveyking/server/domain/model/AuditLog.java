package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 操作审计日志：谁、什么时候、对什么、做了什么。
 *
 * <p>当前主要记录导出类动作（题库导出、答卷导出、导入），
 * 用于事后追查「题目或成绩是谁导出去的」。
 *
 * <p>2.2.3 起补了四列，让「把 8 分改成 10 分」这类高危动作可追溯（见计划 §5）：
 * <ul>
 * <li>{@code beforeJson} / {@code afterJson}：改前 / 改后快照。只有高危动作才写，
 * 序列化后超过 2KB 会被截断（规则在 {@code AuditRecorder}）；</li>
 * <li>{@code source}：入口来源 web / mcp / api；</li>
 * <li>{@code requestId}：同一次请求的关联 id（{@code X-Request-Id} 或 MDC），可空。</li>
 * </ul>
 */
@Data
@TableName(value = "t_audit_log", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class AuditLog extends BaseModel {

	/** 动作：EXPORT_REPO / EXPORT_ANSWER / IMPORT_REPO 等 */
	private String action;

	/** 目标标识：题库 id、项目 id 等 */
	private String targetId;

	/** 目标名称（题库名/考试名），便于人看 */
	private String targetName;

	/** 附加说明（导出了多少题、多少份答卷等） */
	private String detail;

	/** 改前快照（JSON 文本，仅高危动作；超长时是被截断后的 JSON 外壳） */
	private String beforeJson;

	/** 改后快照（JSON 文本，仅高危动作；超长时是被截断后的 JSON 外壳） */
	private String afterJson;

	/** 来源：web / mcp / api；取不到请求上下文时为空，由库里的默认值兜底 */
	private String source;

	/** 同一次请求的关联 id（X-Request-Id / MDC），可空 */
	private String requestId;

	/** 操作人 IP */
	private String ip;

}
