package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;

/**
 * AI 组卷请求（{@code POST /api/ai/paper/pick}）：<b>从题库抽题</b>，不再是让模型凭空编题。
 *
 * <p>为什么改成抽题：编出来的题没有经过教研、答案也未必对，老师改起来比自己做还慢；
 * 题库里的题是学校自己的资产，AI 只负责「按条件挑、按考点排序、按题型配比凑齐」，
 * 结果可解释、可追溯（每道题都能点回题库改）。
 *
 * <p>{@link #aiSelect} 为 false 时是纯条件抽题（不花 token）；为 true 时由模型在候选集里
 * 按考点覆盖与难度梯度挑一遍，挑不动的题型再用随机补齐。
 *
 * @author ai-actions
 */
@Data
public class AiPaperPickRequest {

	/** 写入哪个项目（可空：空表示只预览不落库；写库仍走 /api/ai/paper/apply） */
	private String projectId;

	/** 题库 id 列表（必填，可多选） */
	private List<String> repoIds;

	/** 章节过滤（可空，题库里的 Template.chapter） */
	private List<String> chapters;

	/** 难度过滤：easy / medium / hard（可空表示不限） */
	private List<String> difficulties;

	/** 题型配比：题型名（SurveySchema.QuestionType 枚举名）→ 比例；与 {@link #questionCount} 一起换算题数 */
	private LinkedHashMap<String, Double> typeRatio;

	/** 题型 → 每题分值（可空）；为空时按总分平均分配 */
	private LinkedHashMap<String, Double> typeScores;

	/** 题量（必填） */
	private Integer questionCount;

	/** 总分（必填） */
	private Double totalScore;

	/** 自然语言补充要求，例如「优先挑案例题，避开去年考过的章节」 */
	private String requirements;

	/** 是否让模型参与挑选（默认 true）；false = 纯随机抽题 */
	private Boolean aiSelect;

	/** 单个题库最多取多少道候选题参与挑选（默认 120，上限 300）：防止把整个题库塞进提示词 */
	private Integer maxCandidates;

}
