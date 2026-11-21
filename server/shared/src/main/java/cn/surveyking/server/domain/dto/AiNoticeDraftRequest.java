package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;








@Data
public class AiNoticeDraftRequest {


	private String points;


	private String audience;


	private List<String> classIds;


	private String tone;


	private String subject;

}
