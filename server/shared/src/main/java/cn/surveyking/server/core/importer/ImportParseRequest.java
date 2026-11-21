package cn.surveyking.server.core.importer;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;




@Data
public class ImportParseRequest {

	private String kind;


	private String target;

	private String text;

	private MultipartFile file;

}
