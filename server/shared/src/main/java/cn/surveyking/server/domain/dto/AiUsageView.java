package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * AI 用量当日汇总（{@code GET /api/ai/usage/today}）。
 *
 * <p>给「AI 入口显示剩余额度」和「超限时告诉老师到底用在哪了」两件事用。数字来自 {@code t_ai_usage}，
 * 与限额判断是同一口径，不会出现「界面上还有额度、调用却报超限」。
 *
 * @author p4-backend
 */
@Data
public class AiUsageView {

	/** 当前用户今日已用 token */
	private Long userTokens;

	/** 单用户每日上限；null 或 <= 0 表示不限 */
	private Integer userLimit;

	/** 全站今日已用 token（管理员看全站，普通老师看也只看得到总用量，不含他人明细） */
	private Long dailyTokens;

	/** 全站每日上限；null 或 <= 0 表示不限 */
	private Integer dailyLimit;

	/** 按场景汇总 */
	private List<SceneUsage> scenes = new ArrayList<>();

	@Data
	public static class SceneUsage {

		/** paper_generate / question_rewrite / grade_suggest / report_summary */
		private String scene;

		/** 调用次数 */
		private Long calls;

		/** 合计 token */
		private Long tokens;

	}

}
