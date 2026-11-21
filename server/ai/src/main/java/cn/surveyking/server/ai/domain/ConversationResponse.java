package cn.surveyking.server.ai.domain;

import lombok.Data;
import java.util.Map;






@Data
public class ConversationResponse {




	private String id;




	private Long createdAt;




	private Map<String, String> metaData;

}