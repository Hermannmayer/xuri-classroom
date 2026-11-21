package cn.surveyking.server.service;

import cn.surveyking.server.ai.domain.AiChatReply;
import cn.surveyking.server.ai.domain.AiChatRequest;
import cn.surveyking.server.ai.domain.AiStatusView;













public interface AiAssistantService {

	/**
	 * 一轮对话：把历史消息 + 当前页面上下文交给模型，返回助手正文。
	 * <p>记账、限额、内容校验都在实现里完成；失败时抛 {@code ErrorCodeException}（中文，可直接展示）。
	 */
	AiChatReply chat(AiChatRequest request);

	/**
	 * 现在能不能聊：判断口径与真正调用一致，<b>不调模型、不记用量</b>。
	 * <p>侧栏打开时先问一次，不能聊直接显示「去系统设置配模型」的引导。
	 */
	AiStatusView status();

}
