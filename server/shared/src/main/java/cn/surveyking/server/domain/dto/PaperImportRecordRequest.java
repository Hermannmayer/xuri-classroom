package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 试卷导入完成后的审计记录（只记日志，不改数据）。
 */
@Data
public class PaperImportRecordRequest {

	private String projectId;

	/** 来源：word / excel / text / json */
	private String source;

	private Integer total;

}
