package cn.surveyking.server.ai.domain;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;



















@Data
public class AiChatAction {


	private String key;


	private String status;


	private String title;


	private String summary;


	private String tool;


	private String link;


	private String jobId;


	private String undoToken;


	private Map<String, Object> params = new LinkedHashMap<>();

}
