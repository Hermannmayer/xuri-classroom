package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;






@Data
public class AiPracticeRecommendView {


	private List<SurveySchema> questions = new ArrayList<>();


	private List<Focus> focus = new ArrayList<>();


	private String summary;

	private AiPaperJobView.Stats stats;

	@Data
	public static class Focus {


		private String point;


		private Double rate;


		private Integer questions;


		private Integer recommended;

	}

}
