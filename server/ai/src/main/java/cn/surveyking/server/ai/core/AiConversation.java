package cn.surveyking.server.ai.core;

import lombok.Builder;
import lombok.Getter;

import java.util.List;










@Getter
@Builder
public class AiConversation {





	private final List<AiChatTurn> turns;


	private final String model;


	private final Double temperature;


	@Builder.Default
	private final boolean background = false;

}
