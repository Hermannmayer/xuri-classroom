package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 题库体检结果（{@code GET /api/ai/paper/job/{jobId}} 的 result）。
 *
 * <p>体检只<b>给建议</b>，不直接改题库：{@link Patch} 里每个字段都是「建议值」，
 * 老师在页面里勾选后走 {@code POST /api/ai/repo/audit/apply} 才真正写回。
 *
 * @author ai-actions
 */
@Data
public class AiRepoAuditView {

	/** 中文摘要，例如「体检 40 题：缺解析 12 题、缺难度 9 题、疑似重复 3 组」 */
	private String summary;

	/** 结构性问题（缺分值、缺答案、题干为空等确定性检查，不需要模型） */
	private List<AiPaperCheckView.Issue> issues = new ArrayList<>();

	/** 疑似重复的题目组（组内互相比对） */
	private List<Duplicate> duplicates = new ArrayList<>();

	/** 逐题补全建议（只填需要改的字段） */
	private List<Patch> patches = new ArrayList<>();

	/** 本次实际体检的题数 */
	private Integer checked;

	@Data
	public static class Duplicate {

		/** 题目 id（>=2 道被判定为相似） */
		private List<String> ids = new ArrayList<>();

		/** 题干列表，顺序与 ids 一致，方便前端直接展示 */
		private List<String> titles = new ArrayList<>();

		/** 0~1 的相似度（模型给的判定，不是字面重复率） */
		private Double similarity;

		/** 判定理由 */
		private String reason;

		/** 建议：merge 合并留一 / review 人工确认 */
		private String suggestion;

	}

	@Data
	public static class Patch {

		private String id;

		/** 题干摘要（前端列表里显示，避免只看到 id） */
		private String title;

		/** 建议难度：easy / medium / hard（不改则为空） */
		private String difficulty;

		/** 建议章节（不改则为空） */
		private String chapter;

		/** 建议标签（不改则为空数组） */
		private List<String> tags;

		/** 建议解析（不改则为空） */
		private String analysis;

		/** 为什么这么建议 */
		private String reason;

	}

}
