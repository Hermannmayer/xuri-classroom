package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;





@Data
public class UserBookRequest {

	private String id;




	private String templateId;




	private String name;




	private Integer wrongTimes;




	private String note;




	private Integer status;




	private Integer type;

	private List<String> ids;

	private Boolean isMarked;

	private LinkedHashMap answer;

	private String answerId;


	private String projectId;


	private String repoId;

}
