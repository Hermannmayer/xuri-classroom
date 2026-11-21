package cn.surveyking.server.domain.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import java.util.Date;





@Data
public class RepoRequest {

	private String id;




	private String name;




	private String description;




	private String[] tag;




	private Integer priority;




	private String setting;




	private String mode;

	private Boolean shared;




	@NotBlank(message = "题库分类不能为空")
	private String category;




	private Boolean isPractice;


	private Date openStartAt;


	private Date openEndAt;

}
