package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Map;





@Data
public class ReportData {

	private Integer total;

	private Map<String, Data> statistics;




	private Map<String, Integer> dailyCountStat;

	@lombok.Data
	public static class Data {

		private Number min;

		private Number max;

		private Number average;

		private Number sum = 0;


		private int total;

	}

}
