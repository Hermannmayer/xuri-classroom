package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;





@Data
public class UserView {

	private String id;

	private String name;

	private String username;

	private String phone;

	private String email;

	private String avatar;

	private String gender;

	private Integer status;


	private String userType;

	private Date createAt;

	private String deptId;

	private String deptName;


	private List<String> deptIds;


	private String uiZoom;


	private String uiTheme;


	private List<String> deptNames;

	private List<RoleView> roles;


	private List<UserPositionView> userPositions;

}
