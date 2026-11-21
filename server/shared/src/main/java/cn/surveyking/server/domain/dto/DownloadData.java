package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;





@Data
public class DownloadData {

	private String fileName;

	private Resource resource;

	private MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;

}
