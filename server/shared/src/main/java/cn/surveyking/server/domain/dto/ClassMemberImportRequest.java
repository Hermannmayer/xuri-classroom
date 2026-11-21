package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;







@Data
public class ClassMemberImportRequest {


	private String deptId;


	private MultipartFile file;

}
