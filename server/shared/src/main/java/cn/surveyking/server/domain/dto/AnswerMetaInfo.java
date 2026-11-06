package cn.surveyking.server.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * @author javahuang
 * @date 2021/8/6
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AnswerMetaInfo {

	private ClientInfo clientInfo;

	private AnswerInfo answerInfo;

	/**
	 * 本次作答累计切屏次数：超过考试允许次数会触发自动交卷
	 */
	private Integer switchScreenTimes;

	/**
	 * 闯关模式：每题实际用时（秒），questionId → seconds。前端计时、随交卷一起上报。
	 */
	private Map<String, Integer> passModeTimes;

	/**
	 * 闯关模式：被判超时的题目 id（交卷时由服务端按 passModePerSeconds 裁决并回写，超时题计 0 分）
	 */
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

		/** 地区 */
		private String region;

		private String deviceType;

		private String cookie;

	}

}
