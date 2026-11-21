package cn.surveyking.server.ai.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;






@Data
@NoArgsConstructor
@AllArgsConstructor
public class StreamResponseEvent {




	private EventTypeEnum eventType;




	private String content;




	private String reasoningContent;

	public StreamResponseEvent(EventTypeEnum eventType, String content) {
		this.eventType = eventType;
		this.content = content;
	}

}