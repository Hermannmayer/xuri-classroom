package cn.surveyking.server.ai.core;

import lombok.Builder;
import lombok.Getter;
import org.springframework.util.StringUtils;










@Getter
@Builder
public class AiReadiness {


	private final boolean ready;


	private final String reason;


	private final String model;

	public static AiReadiness ready(String model) {
		return AiReadiness.builder().ready(true).model(model).build();
	}

	public static AiReadiness notReady(String reason) {
		return AiReadiness.builder().ready(false).reason(StringUtils.hasText(reason) ? reason : "AI 暂不可用").build();
	}

}
