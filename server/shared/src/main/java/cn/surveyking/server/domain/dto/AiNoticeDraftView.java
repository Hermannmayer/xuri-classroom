package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;






@Data
public class AiNoticeDraftView {

	private String title;


	private String content;


	private String audience;


	private List<String> classIds;


	private String tip;

}
