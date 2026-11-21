package cn.surveyking.server.domain.dto;

import lombok.Data;








@Data
public class NoticeRequest {


	private String id;

	private String title;


	private String content;


	private String type;


	private String audience;


	private String scopeType;


	private String scopeId;


	private Boolean pinned;


	private Boolean requireAck;


	private Long expireAt;

}
