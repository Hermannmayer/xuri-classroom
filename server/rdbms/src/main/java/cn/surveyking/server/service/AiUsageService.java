package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiUsageView;

/**
 * AI 用量记账与限额。
 *
 * <p>为什么记账不放 {@code ai} 模块：AI 内核要保持「无 DB 依赖」（这样它能在没有数据库的
 * 单测/工具里直接用），而记账天然要写库。所以内核只负责「调用 + 返回用量」，
 * 由本服务（rdbms）决定记不记、记什么、要不要先拦。
 *
 * <p>两层限额（数值来自系统设置 {@code AiSetting}）：
 * <ul>
 * <li>{@link #assertQuota} 单用户每日：默认 20 万 token，拦「一个人把全站额度用光」；</li>
 * <li>{@link #assertQuota} 全站每日：默认 200 万 token，拦「账单爆炸」这个唯一的成本级风险。</li>
 * </ul>
 * 超限时<b>不调模型</b>，直接抛中文提示（{@code 400}），前端原样弹给老师。
 *
 * @author p4-backend
 */
public interface AiUsageService {

	/** 场景：AI 出卷 */
	String SCENE_PAPER_GENERATE = "paper_generate";

	/** 场景：AI 改题 */
	String SCENE_QUESTION_REWRITE = "question_rewrite";

	/** 场景：AI 批改建议 */
	String SCENE_GRADE_SUGGEST = "grade_suggest";

	/** 场景：AI 学情总结 */
	String SCENE_REPORT_SUMMARY = "report_summary";

	/** 场景：侧栏 AI 助手对话 */
	String SCENE_CHAT = "chat";

	/** 全站每日 token 上限默认值（200 万） */
	int DEFAULT_DAILY_TOKEN_LIMIT = 2_000_000;

	/** 单用户每日 token 上限默认值（20 万） */
	int DEFAULT_PER_USER_TOKEN_LIMIT = 200_000;

	/**
	 * 限额闸门：超限直接抛 {@code ErrorCodeException}（中文提示），<b>不调用模型</b>。
	 * @param userId 调用人；为空时只检查全站额度
	 */
	void assertQuota(String userId);

	/**
	 * 记一笔用量。
	 *
	 * <p>记账失败不能影响业务：老师要的是题目，不是「记账没成功所以整单失败」。
	 * 内部吞掉异常并打 error 日志。
	 * @param userId 调用人
	 * @param scene 场景（见本接口的 SCENE_* 常量）
	 * @param model 模型 id（拿不到时传 null）
	 * @param promptTokens 输入 token
	 * @param completionTokens 输出 token
	 * @param costMs 耗时（毫秒）
	 * @param status ok / error / rejected
	 * @param error 失败原因摘要（成功传 null）
	 */
	void record(String userId, String scene, String model, int promptTokens, int completionTokens, long costMs,
			String status, String error);

	/** 当前用户视角的当日用量（含全站合计与按场景汇总） */
	AiUsageView today();

}
