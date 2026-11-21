package cn.surveyking.server.domain.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;


@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClassResourceSetting {


	private Integer extraAttempts;


	private Boolean answerAnalysis;


	private Boolean practiceEnabled;

}
