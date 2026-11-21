package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiNoticeDraftRequest;
import cn.surveyking.server.domain.dto.AiNoticeDraftView;






public interface AiNoticeDraftService {

	AiNoticeDraftView draft(AiNoticeDraftRequest request);

}
