package cn.surveyking.server.domain.dto;

import lombok.Data;





@Data
public class PublicLinkRequest {




	private String projectId;




	private String questionId;




	private String optionId;




	private Object value;

}
