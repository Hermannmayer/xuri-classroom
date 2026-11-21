package cn.surveyking.server.domain.dto;

import lombok.Data;




@Data
public class TeachingClassView {

	private String deptId;

	private String deptName;


	private Long answerCount;


	private Double avgScore;

}
