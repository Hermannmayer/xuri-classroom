package cn.surveyking.server.ai.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;






@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiMessage {




	private String conversationId;




	private String role;




	private String content;

}