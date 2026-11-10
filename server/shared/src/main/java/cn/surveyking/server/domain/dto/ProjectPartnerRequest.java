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

	/** 单个成员 id（调整授权级别时用，与 ids 区分） */
	private String id;

	private List<String> ids;

	private String projectId;

	private Integer type;

	/**
	 * 授权级别：1 只读 / 2 可编辑（默认）/ 3 可授权。只对协作者（type=2）生效。
	 */
	private Integer accessLevel;

	private List<String> userIds;

	/**
	 * 授权给用户组（t_dept.id），与 userIds 二选一
	 */
	private String groupId;

	private List<String> userNames;

	private MultipartFile file;

	private List<String> projectIds;

}
