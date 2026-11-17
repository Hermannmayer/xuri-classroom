package cn.surveyking.server.ai.core;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 一次多轮对话补全请求（{@link AiGateway#completeConversation} 的入参）。
 *
 * <p>与单轮的 {@link AiRequest} 分开，而不是给它加个 {@code messages} 字段：出卷 / 改题 / 批改 / 学情
 * 四个场景都是「一段系统提示 + 一段用户输入」，混进消息列表后每个调用点都要重新判断该用哪条路径，
 * 反而容易出错。这里保留两条明确的入口。
 *
 * @author ai-sidebar
 */
@Getter
@Builder
public class AiConversation {

	/**
	 * 对话消息，顺序即对话顺序；第一条通常是 {@code system}（由后端渲染提示词得到），
	 * 最后一条必须是 {@code user}。
	 */
	private final List<AiChatTurn> turns;

	/** 指定模型；为空用系统设置里的默认模型 */
	private final String model;

	/** 温度；为空不下发（由服务端默认值决定）。对话场景建议 0.4~0.7 */
	private final Double temperature;

}
