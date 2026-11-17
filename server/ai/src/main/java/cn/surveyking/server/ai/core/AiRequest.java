package cn.surveyking.server.ai.core;

import lombok.Builder;
import lombok.Getter;

/**
 * 一次非流式补全请求（{@link AiGateway#complete} 的入参）。
 *
 * <p>刻意只放最少的四个字段：P4 的四个场景都是「给一段系统提示 + 一段用户输入，要回一段文本/JSON」，
 * 温度、模型都可以不传（不传就用系统设置里的默认模型与默认温度）。
 *
 * @author p4-backend
 */
@Getter
@Builder
public class AiRequest {

	/** 系统提示词：角色与输出格式约束 */
	private final String systemPrompt;

	/** 用户输入：题目参数 / 题干 / 答卷片段 */
	private final String userPrompt;

	/** 指定模型；为空用系统设置里的默认模型 */
	private final String model;

	/** 温度；为空不下发（由服务端默认值决定） */
	private final Double temperature;

}
