package cn.surveyking.server.domain.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;





@Data
public class FileView {




	private String id;




	private String originalName;




	private String previewUrl;

	@JsonIgnore
	private String filePath;




	private String content;


	@JsonIgnore
	private String questionId;

}
