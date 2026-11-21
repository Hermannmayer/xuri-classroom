package cn.surveyking.server.domain.dto;

import lombok.Data;




@Data
public class TeachingProjectView {

	private String projectId;

	private String projectName;

	private Integer status;


	private Long answerCount;


	private Double avgScore;

}
