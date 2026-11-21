package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class MyTaskView {

	private String id;




	private String projectId;




	private String answerId;




	private String name;




	private Long examStartTime;




	private Long examEndTime;




	private Long startTime;




	private Long endTime;




	private Integer status;




	private Double examScore;




	private Double examTotal;

}
