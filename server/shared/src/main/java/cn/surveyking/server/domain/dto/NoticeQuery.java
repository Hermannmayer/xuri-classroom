package cn.surveyking.server.domain.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;








@Data
@EqualsAndHashCode(callSuper = false)
public class NoticeQuery extends PageQuery {


	private Boolean onlyUnread;


	private String type;


	private String status;


	private String audience;


	private String scopeType;


	private String keyword;

}
