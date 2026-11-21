package cn.surveyking.server.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;





@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AnswerMetaInfo {

	private ClientInfo clientInfo;

	private AnswerInfo answerInfo;




	private Integer switchScreenTimes;




	private Map<String, Integer> passModeTimes;




	private List<String> passModeTimeouts;

	@Data
	public static class AnswerInfo {

		private long startTime;

		private long endTime;

	}

	@Data
	public static class ClientInfo {

		private String agent;

		private String browser;

		private String platformVersion;

		private String browserVersion;

		private String platform;

		private String remoteIp;


		private String region;

		private String deviceType;

		private String cookie;

	}

}
