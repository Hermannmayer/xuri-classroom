package cn.surveyking.server.service;

import cn.surveyking.server.ai.domain.AiChatReply;
import cn.surveyking.server.ai.domain.AiChatRequest;
import cn.surveyking.server.ai.domain.AiStatusView;













public interface AiAssistantService {

	/** 一轮对话：把历史消息 + 当前页面上下文交给模型，返回助手正文 */
	AiChatReply chat(AiChatRequest request);

	/** 现在能不能聊：判断口径与真正调用一致，不调模型、不记用量 */
	AiStatusView status();

}
