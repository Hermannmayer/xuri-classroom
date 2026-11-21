package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;




@Data
public class TemplateBatchRequest {

	private List<String> ids;




	private String[] tag;




	private Boolean appendTag = Boolean.TRUE;




	private String difficulty;




	private Double score;

}
