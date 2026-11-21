package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AuditAnswerTimelineView;

import java.util.List;










public interface AnswerTimelineService {

	/**
	 * 某份答卷的审计时间线，按时间正序。
	 * @param answerId 答卷 id
	 * @return 时间线；没有记录时返回空列表
	 */
	List<AuditAnswerTimelineView> answerTimeline(String answerId);

}
