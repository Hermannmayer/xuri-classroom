package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiPracticeRecommendRequest;

/**
 * 错题重练推荐：按本次考试的得分率找薄弱考点，再从题库抽一组重练题。
 *
 * @author ai-actions
 */
public interface AiPracticeRecommendService {

	/** 提交推荐任务，返回 jobId */
	String recommend(AiPracticeRecommendRequest request);

}
