package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * @author javahuang
 * @date 2022/2/11
 */
@Data
public class SystemInfo {

	/**
	 * 主键
	 */
	private String id;

	/**
	 * 系统名称
	 */
	private String name;

	/**
	 * 系统描述信息
	 */
	private String description;

	/**
	 * 图标
	 */
	private String avatar;

	/**
	 * 默认语言
	 */
	private String locale;

	/**
	 * 默认语言
	 */
	private String version;

	private RegisterInfo registerInfo;

	private SystemSetting setting;

	private String publicKey;

	private Boolean aiEnabled;

	private OAuthProviderAvailability oauthProviders;

	@Data
	public static class RegisterInfo {

		/**
		 * 是否开启注册
		 */
		private Boolean registerEnabled;

		/**
		 * 注册用户可选角色列表
		 */
		private List<String> roles = new ArrayList<>();

		/**
		 * 开启强密码验证
		 */
		private Boolean strongPasswordEnabled;

		/**
		 * 新用户注册后默认进入的部门
		 */
		private String deptId;

	}

	@Data
	public static class SystemSetting {

		/**
		 * 是否开启验证码
		 */
		private Boolean captchaEnabled;

		/**
		 * 版权
		 */
		private String copyright;

		/**
		 * 备案号
		 */
		private String recordNum;

		/**
		 * 浏览器标签页图标（不填则用 avatar）
		 */
		private String favicon;

		/**
		 * 高德地图 key
		 */
		private String amapKey;

		/**
		 * 高德地图安全密钥
		 */
		private String amapSecurityJsCode;

		/**
		 * 是否开启内容保护（前端防复制：禁用右键/复制/开发者工具快捷键）。
		 * 缺省视为开启；管理员可在系统设置里关闭。粘贴不受影响，学员仍可往输入框里粘答案。
		 */
		private Boolean copyProtected;

		/**
		 * 是否显示全站水印。缺省视为开启，用于截图外流后的溯源。
		 */
		private Boolean watermarkEnabled;

		/**
		 * 水印内容，取值 name_phone（姓名+手机号，默认） / name（只显示姓名） / phone（只显示手机号）。
		 */
		private String watermarkMode;

		/**
		 * 可作为「项目协作者」的权限串，默认 project:create。
		 * 只有具备该权限的账号才会出现在协作者候选列表里（超级管理员始终可以）。
		 * 学员默认没有 project:create，因此不会被误加成协作者。
		 */
		private String collaboratorAuthority;

	}

	@Data
	public static class AiSetting {

		private Boolean enabled;

		/**
		 * OpenAI-compatible API base URL, for example https://api.openai.com/v1.
		 */
		private String baseUrl;

		private List<String> models;

		private String defaultModel;

		private String apiKey;

		/**
		 * Legacy SiliconFlow token. Kept for backward compatibility with existing
		 * configuration records.
		 */
		private String token;

		private String prompt;

	}

}
