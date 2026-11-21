package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiUsageView;

















public interface AiUsageService {


	String SCENE_PAPER_PICK = "paper_pick";


	String SCENE_PAPER_CHECK = "paper_check";


	String SCENE_REPO_AUDIT = "repo_audit";


	String SCENE_NOTICE_DRAFT = "notice_draft";


	String SCENE_PRACTICE_RECOMMEND = "practice_recommend";


	String SCENE_GRADE_BATCH = "grade_batch";


	String SCENE_QUESTION_REWRITE = "question_rewrite";


	String SCENE_GRADE_SUGGEST = "grade_suggest";


	String SCENE_REPORT_SUMMARY = "report_summary";


	String SCENE_CHAT = "chat";


	String SCENE_CHAT_INTENT = "chat_intent";


	int DEFAULT_DAILY_TOKEN_LIMIT = 2_000_000;


	int DEFAULT_PER_USER_TOKEN_LIMIT = 200_000;


	int DEFAULT_MAX_CHAT_TURNS = 20;


	int DEFAULT_MAX_TURN_CHARS = 4_000;


	int DEFAULT_RATE_LIMIT_PER_MINUTE = 10;

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
