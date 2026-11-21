package cn.surveyking.server.domain.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;





@Data
public class PublicDictRequest {

	@NotBlank(message = "字典编码不能为空")
	private String dictCode;




	private String search;




	private String parentValue;




	private Integer limit;




	private Integer cascaderLevel;

}
