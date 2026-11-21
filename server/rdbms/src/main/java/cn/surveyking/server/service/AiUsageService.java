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

	/** 限额闸门：超限直接抛 ErrorCodeException（中文提示），不调用模型 */
	void assertQuota(String userId);

	/** 记一笔用量 */
	void record(String userId, String scene, String model, int promptTokens, int completionTokens, long costMs,
			String status, String error);

	/** 当前用户视角的当日用量（含全站合计与按场景汇总） */
	AiUsageView today();

}
