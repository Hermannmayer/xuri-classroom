package cn.surveyking.server.ai.domain;

import lombok.Data;









@Data
public class AiStatusView {








	private Boolean enabled;


	private Boolean ready;


	private String reason;


	private String model;

	private Boolean supportsImage;

}
