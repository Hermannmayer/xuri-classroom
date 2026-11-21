package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;







@Data
public class NoticeReadRequest {


	private String id;


	private List<String> ids;

}
