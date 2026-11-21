package cn.surveyking.server.domain.dto;

import lombok.Data;




@Data
public class PaperImportRecordRequest {

	private String projectId;


	private String source;

	private Integer total;

}
