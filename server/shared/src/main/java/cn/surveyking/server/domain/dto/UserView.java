package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.Date;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/10/15
 */
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

	private Date createAt;

	private String deptId;

	private String deptName;

	/** 附加组 id 列表（主组仍用 deptId）；用户组编辑弹窗回显用 */
	private List<String> deptIds;

	/** 界面缩放，前端登录后直接套用 */
	private String uiZoom;

	/** 主题：light / dark */
	private String uiTheme;

	/** 附加组名称，列表展示用 */
	private List<String> deptNames;

	private List<RoleView> roles;

	/** 用户岗位 */
	private List<UserPositionView> userPositions;

}
