package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;










@Data
public class NoticeView {

	private String id;

	private String title;


	private String summary;


	private String content;


	private String type;


	private String audience;


	private String scopeType;

	private String scopeId;


	private String scopeName;

	private Boolean pinned;

	private Boolean requireAck;


	private String status;

	private Date publishAt;

	private Date expireAt;

	private String createBy;

	private String createByName;

	private Date createAt;

	private Date updateAt;


	private Boolean read;

	private Date readAt;


	private Boolean manageable;

}
