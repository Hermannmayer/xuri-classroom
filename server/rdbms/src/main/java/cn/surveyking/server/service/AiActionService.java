package cn.surveyking.server.service;

import cn.surveyking.server.ai.domain.AiChatAction;
import cn.surveyking.server.ai.domain.AiChatRequest;













public interface AiActionService {

	/** 识别并执行一条消息对应的动作；返回 动作结果；返回 null 表示「这句话不是系统操作」，调用方继续走普通聊天。 */
	AiChatAction handle(String message, AiChatRequest.Context context, String userId, boolean firstTurn);

}
