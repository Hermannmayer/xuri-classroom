package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;





@Data
public class RepoTemplateRequest {

	private String repoId;

	private List<TemplateRequest> templates;

	private List<String> ids;

	private MultipartFile file;




	private String kind;




	private String text;

}
