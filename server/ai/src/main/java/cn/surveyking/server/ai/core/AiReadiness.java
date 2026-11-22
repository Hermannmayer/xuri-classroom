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

	private final boolean supportsImage;

	public static AiReadiness ready(String model) {
		return ready(model, false);
	}

	/** 就绪状态；supportsImage 表示当前模型在模型目录里勾了图片输入。 */
	public static AiReadiness ready(String model, boolean supportsImage) {
		return AiReadiness.builder().ready(true).model(model).supportsImage(supportsImage).build();
	}

	public static AiReadiness notReady(String reason) {
		return AiReadiness.builder().ready(false).reason(StringUtils.hasText(reason) ? reason : "AI 暂不可用").build();
	}

}
