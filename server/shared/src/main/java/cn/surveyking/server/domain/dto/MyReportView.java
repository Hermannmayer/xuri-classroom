package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;




@Data
public class MyReportView {

	private String projectId;

	private String projectName;


	private Integer status;


	private Integer attempts;


	private Double bestScore;


	private Date lastSubmitAt;

}
