package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiNoticeDraftRequest;
import cn.surveyking.server.domain.dto.AiNoticeDraftView;

/**
 * 公告草稿：把老师写的几句要点补成一条规范通知（只出草稿，不发布）。
 *
 * @author ai-actions
 */
public interface AiNoticeDraftService {

	AiNoticeDraftView draft(AiNoticeDraftRequest request);

}
