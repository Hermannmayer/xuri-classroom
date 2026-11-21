package cn.surveyking.server.domain.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;





@Data
public class UploadFileRequest {




	private String basePath;

	private MultipartFile file;

	private int fileType;

	private String id;

	private String projectId;


	private String ownerType;

	private String ownerId;

	private String questionId;




	private Boolean publicRead;

	@JsonIgnore
	public Boolean publicUpload;

}
