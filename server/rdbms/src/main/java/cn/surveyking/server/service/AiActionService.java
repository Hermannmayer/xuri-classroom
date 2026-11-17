package cn.surveyking.server.service;

import cn.surveyking.server.ai.domain.AiChatAction;
import cn.surveyking.server.ai.domain.AiChatRequest;

/**
 * 对话 → 系统动作的路由。
 *
 * <p>为什么要在聊天前面加一层意图识别：老师说的话本身就是操作（「把这个班没批的卷子批了」），
 * 让模型只回一段文字等于把活儿又推回给人。这里的做法是——先用一次低温调用把话翻译成
 * {@code action + args}，能执行的直接执行（或打开对应工具），执行不了才回退成普通聊天。
 *
 * <p>安全边界：意图识别只产出「动作名 + 参数」，<b>参数里不接受任何自由文案</b>；
 * 真正的权限、数据范围、可写条件全部在具体动作实现里判（见 {@link AiGradeBatchService}）。
 *
 * @author ai-actions
 */
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
