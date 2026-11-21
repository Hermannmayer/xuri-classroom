package cn.surveyking.server.ai.service.impl;

import cn.surveyking.server.ai.domain.ChatRequest;
import cn.surveyking.server.ai.domain.ConversationRequest;
import cn.surveyking.server.ai.domain.ConversationResponse;
import cn.surveyking.server.ai.domain.ModelType;
import cn.surveyking.server.ai.domain.StreamResponseEvent;
import cn.surveyking.server.ai.domain.AiMessage;
import cn.surveyking.server.ai.service.AiChatService;
import cn.surveyking.server.ai.service.ChatService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Collections;
import java.util.List;
import java.util.function.Consumer;






@Slf4j
@Service
public class ChatServiceImpl implements ChatService {

	@Autowired
	private OpenAiCompatibleChatServiceImpl openAiCompatibleChatService;

	@Override
	public List<ModelType> getAllModelTypes() {

		if (!openAiCompatibleChatService.isEnabled()) {
			log.warn("AI功能未启用，返回空模型列表");
			return Collections.emptyList();
		}

		return openAiCompatibleChatService.getSupportedModels();
	}

	@Override
	public ConversationResponse createConversation(ConversationRequest conversationRequest, String model) {

		if (!openAiCompatibleChatService.isEnabled()) {
			log.warn("AI功能未启用，无法创建对话");
			throw new IllegalStateException("AI功能未启用");
		}

		if (conversationRequest == null) {
			conversationRequest = new ConversationRequest();
		}
		if (org.springframework.util.StringUtils.hasText(model)) {
			conversationRequest.setModel(model);
		}
		return openAiCompatibleChatService.createConversation(conversationRequest);
	}

	@Override
	public Flux<StreamResponseEvent> createChatStream(ChatRequest chatRequest, String conversationId, String model) {

		Consumer<AiMessage> emptyConsumer = message -> {

			log.debug("Received AI message: {}", message.getContent());
		};

		return openAiCompatibleChatService.createChatStream(chatRequest, conversationId, model, emptyConsumer);
	}

}
