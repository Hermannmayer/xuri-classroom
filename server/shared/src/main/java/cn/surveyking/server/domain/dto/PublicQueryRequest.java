package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;







@Data
public class PublicQueryRequest {

	private String id;

	private String resultId;




	private LinkedHashMap answer;




	private Map<String, String> query = new LinkedHashMap<>();

}
