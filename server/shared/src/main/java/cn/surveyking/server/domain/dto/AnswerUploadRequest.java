package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;





@Data
public class AnswerUploadRequest {

	private MultipartFile file;

	private String projectId;




	private Boolean autoSchema;

	private String parentId;

}
