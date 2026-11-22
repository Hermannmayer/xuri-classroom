package cn.surveyking.server.ai.core;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AiRequest {

	private final String systemPrompt;

	private final String userPrompt;

	private final String model;

	private final Double temperature;

	@Builder.Default
	private final List<String> imageDataUrls = List.of();

	@Builder.Default
	private final boolean background = false;

}
