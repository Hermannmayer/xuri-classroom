package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;





@Data
public class UserRequest {

	private String id;

	private String deptId;





	private List<String> deptIds;

	private String name;

	private String avatar;

	private String profile;


	private String username;


	private String password;


	private String oldPassword;

	private List<String> roles;

	private String phone;

	private String email;

	private String gender;

	private Integer status;


	private String userType;

	private List<UserPositionRequest> userPositions;

	private MultipartFile file;




	private Integer correctTimes;


	private String uiZoom;


	private String uiTheme;

}
