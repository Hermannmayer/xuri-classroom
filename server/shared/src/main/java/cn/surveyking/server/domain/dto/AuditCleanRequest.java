package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 审计日志清理：all=true 清空；否则按 beforeDays 或 before 删除。
 */
@Data
public class AuditCleanRequest {

	private Boolean all;

	private Integer beforeDays;

	private String before;

}
