package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;





@Data
public class PublicStatisticsView {




	private int count;

	private Map<String, QuestionStatistics> questionStatistics;

	@Data
	public static class QuestionStatistics {




		private int count;

		List<OptionStatistics> optionStatistics;

		public QuestionStatistics() {
		}

		public QuestionStatistics(int count, List<OptionStatistics> optionStatistics) {
			this.count = count;
			this.optionStatistics = optionStatistics;
		}

	}

	@Data
	public static class OptionStatistics {

		private String optionId;

		private int count;

		private int percentage;

	}

}
