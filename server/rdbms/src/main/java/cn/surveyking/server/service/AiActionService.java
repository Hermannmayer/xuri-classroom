package cn.surveyking.server.service;

import cn.surveyking.server.ai.domain.AiChatAction;
import cn.surveyking.server.ai.domain.AiChatRequest;













public interface AiActionService {

	/**
	 * 识别并执行一条消息对应的动作。
	 * @param message 用户这一句
	 * @param context 当前页面上下文（项目 / 班级 / 题库 / 答疑 id）
	 * @param userId 当前用户（后台线程里拿不到 SecurityContext，必须显式传）
	 * @param firstTurn 是不是这轮对话的第一句：第一句才做「无关键词也识别一次」，
	 *                  避免每句追问都多花一次模型调用（追问大多不是新指令）
	 * @return 动作结果；返回 null 表示「这句话不是系统操作」，调用方继续走普通聊天
	 */
	AiChatAction handle(String message, AiChatRequest.Context context, String userId, boolean firstTurn);

}
