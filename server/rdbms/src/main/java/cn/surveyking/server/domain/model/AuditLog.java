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

	/** 操作人 IP */
	private String ip;

}
