package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;





@Data
public class PublicLinkResult {

	LinkedHashMap<String, Map<String, Object>> answer;

}
