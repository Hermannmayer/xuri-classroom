package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 题库体检建议应用请求（{@code POST /api/ai/repo/audit/apply}）。
 *
 * <p>只写老师勾选的字段：{@code null} / 空集合一律视为「不改」，这样「只采纳解析」不会顺手把难度覆盖掉。
 *
 * @author ai-actions
 */
@Data
public class AiRepoAuditApplyRequest {

	private String repoId;

	private List<AiRepoAuditView.Patch> patches;

}
