package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiPracticeRecommendRequest;






public interface AiPracticeRecommendService {

	/** 提交推荐任务，返回 jobId */
	String recommend(AiPracticeRecommendRequest request);

}
