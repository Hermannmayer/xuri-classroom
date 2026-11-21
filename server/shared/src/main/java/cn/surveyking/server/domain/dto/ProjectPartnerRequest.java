package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;





@Data
public class ProjectPartnerRequest {


	private String id;

	private List<String> ids;

	private String projectId;

	private Integer type;




	private Integer accessLevel;

	private List<String> userIds;




	private String groupId;

	private List<String> userNames;

	private MultipartFile file;

	private List<String> projectIds;

}
