package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * @author javahuang
 * @date 2022/1/28
 */
@Data
public class ProjectPartnerRequest {

	private List<String> ids;

	private String projectId;

	private Integer type;

	private List<String> userIds;

	/**
	 * 授权给用户组（t_dept.id），与 userIds 二选一
	 */
	private String groupId;

	private List<String> userNames;

	private MultipartFile file;

	private List<String> projectIds;

}
