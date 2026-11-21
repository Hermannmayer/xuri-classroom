package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;









@Data
public class AiPaperApplyRequest {

	private String projectId;


	private List<SurveySchema> questions;

}
