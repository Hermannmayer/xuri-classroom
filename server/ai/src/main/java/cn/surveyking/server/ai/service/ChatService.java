package cn.surveyking.server.ai.service;

import cn.surveyking.server.ai.domain.ChatRequest;
import cn.surveyking.server.ai.domain.ConversationRequest;
import cn.surveyking.server.ai.domain.ConversationResponse;
import cn.surveyking.server.ai.domain.ModelType;
import cn.surveyking.server.ai.domain.StreamResponseEvent;
import reactor.core.publisher.Flux;

import java.util.List;






public interface ChatService {

	/** 获取所有模型类型；返回 模型类型列表。 */
	List<ModelType> getAllModelTypes();

	/** 创建会话；返回 会话响应。 */
	ConversationResponse createConversation(ConversationRequest conversationRequest, String model);

	/** 创建聊天流；返回 聊天响应流。 */
	Flux<StreamResponseEvent> createChatStream(ChatRequest chatRequest, String conversationId, String model);

}