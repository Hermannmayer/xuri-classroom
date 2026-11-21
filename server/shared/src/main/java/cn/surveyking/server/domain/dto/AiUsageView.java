package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;









@Data
public class AiUsageView {


	private Long userTokens;


	private Integer userLimit;


	private Long dailyTokens;


	private Integer dailyLimit;


	private List<SceneUsage> scenes = new ArrayList<>();

	@Data
	public static class SceneUsage {


		private String scene;


		private Long calls;


		private Long tokens;

	}

}
