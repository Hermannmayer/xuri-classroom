package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;





















@Data
public class DashboardTrendView {


	private List<String> days = new ArrayList<>();


	private List<Long> answers = new ArrayList<>();


	private List<Long> graded = new ArrayList<>();


	private List<Double> avgScores = new ArrayList<>();


	private List<Long> activeUsers = new ArrayList<>();

}
