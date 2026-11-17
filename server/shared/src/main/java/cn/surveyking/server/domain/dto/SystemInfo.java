package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
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
		 * 历史字段：旧的「全局默认注册部门」。
		 *
		 * <p>新流程改为班级级 allow_register + 学员注册时自己选班，注册接口不再读取本字段；
		 * 保留是为了兼容旧的设置 JSON，不再在系统设置页展示。
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

		/**
		 * 导出密码：非空时，导出题库/答卷必须提供该密码。
		 * 留空表示不启用（仍受 repo:export / answer:export 权限约束）。
		 *
		 * <p>**只在写入时使用**：读取系统信息时该字段一律被置空，避免通过公开的
		 * {@code GET /api/system} 把密码泄露给任何人。前端改用 {@link #exportPasswordEnabled} 判断是否已设置。
		 */
		private String exportPassword;

		/** 是否已设置导出密码（只读派生字段，不回显密码本身） */
		private Boolean exportPasswordEnabled;

		/** 是否开启检查更新（默认开启）；关闭后仍可手动检查。 */
		private Boolean updateCheckEnabled;

		/** GitHub 仓库 owner/repo；为空时回退到 update.github-repo 环境配置。 */
		private String updateGithubRepo;

		/** GitHub API 前缀；为空时回退到 update.github-api-base。 */
		private String updateApiBase;

		/** 自建更新清单 URL；非空时优先于 GitHub。 */
		private String updateManifestUrl;

		/** 检查间隔小时；为空时回退到 update.check-interval-hours。 */
		private Integer updateCheckIntervalHours;

		/**
		 * 是否开启匿名答卷自动清理（默认开启）。
		 *
		 * <p>匿名答题的 cookie 90 天过期；这里按「创建时间早于 N 天」清理匿名答卷，
		 * 避免长期堆积（答卷里可能有个人隐私）。
		 */
		private Boolean anonymousCleanupEnabled;

		/** 匿名答卷保留天数（1~3650，默认 90） */
		private Integer anonymousRetentionDays;

		/** 最近一次清理时间（只读：由清理任务写，客户端传来的值会被忽略） */
		private Date anonymousLastCleanupAt;

		/** 最近一次清理删除的匿名答卷条数（只读：由清理任务写） */
		private Integer anonymousLastCleanupCount;

		/**
		 * 是否对**已逻辑删除**的匿名答卷做物理清理（默认关闭）。
		 *
		 * <p>上面两个字段只做「逻辑删」——答卷进回收站，能恢复，附件也还在。
		 * 长期不物理清会让匿名答卷及其签名图/附件一直占磁盘，所以这里给一个单独的开关：
		 * 打开后，逻辑删除满 {@code anonymousPurgeDelayDays} 天的匿名答卷会被真正删掉（含附件）。
		 * 默认关闭是为了「删错了还能捞回来」这个保底体验。
		 */
		private Boolean anonymousPurgeEnabled;

		/**
		 * 逻辑删除后保留多少天才物理清理（1~3650，默认 7）。
		 * 给管理员留一个后悔窗口：这段时间内还能在回收站里恢复。
		 */
		private Integer anonymousPurgeDelayDays;

		/**
		 * 答卷 PDF 导出的并发数（1~2，默认 1）。
		 *
		 * <p>PDF 渲染是 CPU 密集型：这台机器只有 4 核，还要同时跑 MySQL、前端构建和学生答题。
		 * 调到 2 能把 50 份的导出时间压到一半，但考试高峰会有感。队列满时后端直接拒绝并提示。
		 */
		private Integer answerPdfConcurrency;

		/**
		 * 考试进行中是否暂停答卷 PDF 导出（默认 true）。
		 *
		 * <p>导出会持续占用一个核几十秒，开考瞬间几十人同时交卷时容易把答题页拖慢。
		 * 暂停时后端返回明确中文提示，老师换个时间再导；Excel 明细导出不受此限制。
		 */
		private Boolean pauseAnswerPdfDuringExam;

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

		/**
		 * 全站每日 token 上限（默认 200 万）。
		 *
		 * <p>双层限额的第一层：AI 成本失控是这条功能唯一的「账单级」风险，先给保守默认值。
		 * 为 null 或 <= 0 表示不限（自建模型、学校自己的 key 想放开时用）。
		 */
		private Integer dailyTokenLimit;

		/**
		 * 单用户每日 token 上限（默认 20 万）。
		 *
		 * <p>双层限额的第二层：拦住「一个人把全站额度用光」。同样为 null 或 <= 0 表示不限。
		 */
		private Integer perUserDailyLimit;

	}

}
