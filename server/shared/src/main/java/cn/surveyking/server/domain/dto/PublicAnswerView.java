package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.LinkedHashMap;





@Data
public class PublicAnswerView {




	private String answerId;




	private Double examScore;




	private Integer examRanking;

	private LinkedHashMap questionScore;

	private LinkedHashMap<String, Object> answer;

	private Date createAt;

}
