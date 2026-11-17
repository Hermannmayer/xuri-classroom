package cn.surveyking.server.service;

import cn.surveyking.server.ai.domain.AiChatReply;
import cn.surveyking.server.ai.domain.AiChatRequest;
import cn.surveyking.server.ai.domain.AiStatusView;

/**
 * 侧栏 AI 助手（第五个 AI 场景：多轮对话）。
 *
 * <p>为什么它和另外四个场景一样落在 rdbms 而不是 ai 模块：对话要「带着当前页面」——
 * 试卷名、题干、答卷信息都得按 id 查库并过权限，而 ai 模块是刻意保持无 DB 依赖的内核
 * （{@code AiGateway} / {@code PromptRegistry} / {@code AiContentGuard}）。
 *
 * <p>与 {@code AiAssistService} 分开而不合并：那四个场景是「一种任务一个接口」，
 * 结果结构各不相同；对话是「通用能力」，入口只有一个、形态稳定，混进同一个接口反而更难读。
 *
 * @author ai-sidebar
 */
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
