package cn.surveyking.server.ai.core;

import lombok.Builder;
import lombok.Getter;









@Getter
@Builder
public class AiCompletion {


	private final String text;


	private final String model;

	private final int promptTokens;

	private final int completionTokens;

	private final int totalTokens;


	private final long costMs;

}
