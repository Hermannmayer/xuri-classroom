package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;

/**
 * 答卷操作时间线的一行（计划 §5.4：批改抽屉底部「操作记录」折叠面板）。
 *
 * <p>数据来自 t_audit_log 里 {@code target_id = 答卷 id} 的记录，只读、不可改：
 * 它是「谁在什么时候把哪道题从几分改成几分」的唯一凭证。
 *
 * <p>{@code before} / {@code after} 是解析后的 JSON（对象或数组），不是字符串：
 * 前端可以直接渲染字段，不用再 JSON.parse 一次；历史数据若是被截断的半截 JSON，
 * 这里会原样返回字符串，前端按文本展示即可。
 *
 * @author audit
 */
@Data
public class AuditAnswerTimelineView {

	/** 操作时间 */
	private Date at;

	/** 操作人姓名；账号已删除时回退成 id */
	private String operator;

	/** 动作中文名，如「批改答卷」「撤销批改」；字典没收录时回退动作码 */
	private String actionName;

	/** 涉及的题目 id：只批改一道题时给出，整卷操作（或非批改动作）为 null */
	private String questionId;

	/** 改前快照 */
	private Object before;

	/** 改后快照 */
	private Object after;

}
