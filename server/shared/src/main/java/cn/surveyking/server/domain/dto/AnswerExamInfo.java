package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;





@Data
public class AnswerExamInfo {




	private LinkedHashMap<String, Double> questionScore;

}
