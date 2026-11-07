package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * @author javahuang
 * @date 2021/10/15
 */
@Data
public class UserRequest {

	private String id;

	private String deptId;

	/**
	 * 附加组 id 列表（主组仍用 deptId）。null 表示本次不改，空数组表示清空附加组。
	 * 用户最终所属组 = 主组 ∪ 附加组，权限与有效期按并集计算。
	 */
	private List<String> deptIds;

	private String name;

	private String avatar;

	private String profile;

	/** 登录账号 */
	private String username;

	/** 密码 */
	private String password;

	/** 密码修改原密码 */
	private String oldPassword;

	private List<String> roles;

	private String phone;

	private String email;

	private String gender;

	private Integer status;

	private List<UserPositionRequest> userPositions;

	private MultipartFile file;

	/**
	 * 错题答对次数
	 */
	private Integer correctTimes;

	/** 界面缩放（0.9 / 1 / 1.15 / 1.3），跟着账号走 */
	private String uiZoom;

	/** 主题：light / dark */
	private String uiTheme;

}
