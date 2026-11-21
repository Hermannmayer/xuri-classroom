package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;








@Data
public class AiGradeSuggestView {


	private Double score;


	private Double confidence;


	private List<Point> points = new ArrayList<>();


	private String reason;

	@Data
	public static class Point {


		private String point;


		private Boolean hit;

	}

}
