package cn.surveyking.server.api;

import cn.surveyking.server.ai.core.AiGateway;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.UpdateCheckView;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import cn.surveyking.server.core.constant.PermissionEnum;
import cn.surveyking.server.core.diag.DiagnosticsExporter;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.impl.AnonymousCleanupService;
import cn.surveyking.server.schema.SchemaUpgradeResult;
import cn.surveyking.server.schema.SchemaUpgradeService;
import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;

import jakarta.validation.Valid;
import jakarta.validation.ValidationException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * @author javahuang
 * @date 2021/10/12
 */
@Slf4j
@RestController
@RequestMapping("${api.prefix}/system")
@RequiredArgsConstructor
public class SystemApi {

	private final SystemService systemService;

	private final UserService userService;

	private final PositionService positionService;

	private final DeptService deptService;

	private final DictService dictService;

	private final MessageSource messageSource;

	/** 诊断日志打包：用户在「系统设置」里下载后直接发给管理员 */
	private final DiagnosticsExporter diagnosticsExporter;

	/** 匿名答卷清理（手动触发） */
	private final AnonymousCleanupService anonymousCleanupService;

	private final ObjectMapper objectMapper;

	/** 数据库结构自动升级（启动时执行，这里只读取结果用于展示） */
	private final SchemaUpgradeService schemaUpgradeService;

	/** 公告：发现新版本时往管理员公告里写一条系统消息 */
	private final NoticeService noticeService;

	/** 设置页「自动获取模型列表」：Key 只在服务端使用，不下发浏览器 */
	private final AiGateway aiGateway;

	@Value("${version}")
	private String currentVersion;

	@Value("${update.manifest-url:}")
	private String manifestUrl;

	/** GitHub 仓库（owner/repo）；与 manifest-url 二选一，配了 manifest-url 就优先用它 */
	@Value("${update.github-repo:}")
	private String githubRepo;

	/** GitHub API 前缀；国内可换镜像，接口路径保持一致 */
	@Value("${update.github-api-base:https://api.github.com}")
	private String githubApiBase;

	/** 服务端缓存小时数：默认一天查一次，避免频繁打 GitHub 触发限流 */
	@Value("${update.check-interval-hours:24}")
	private long checkIntervalHours;

	private volatile UpdateCheckView cachedUpdate;

	private volatile long updateCheckedAt;

	/** 上次检查是否失败：失败只缓存 1 小时，网络恢复后能较快重试 */
	private volatile boolean lastCheckFailed;

	@GetMapping("/version")
	public Map<String, Object> version() {
		Map<String, Object> view = new LinkedHashMap<>();
		view.put("version", currentVersion);
		// 数据库结构版本：排查“程序换了但库没跟上”时第一眼要看的东西
		SchemaUpgradeResult schema = schemaUpgradeService.getLastResult();
		if (schema != null) {
			view.put("schemaVersion", schema.getDbVersion());
			view.put("schemaStatus", schema.getStatus() == null ? null : schema.getStatus().name());
			view.put("schemaAppVersion", schema.getAppVersion());
			view.put("schemaMessage", schema.getMessage());
			view.put("schemaAppliedScripts", schema.getAppliedScripts());
		}
		return view;
	}

	/**
	 * 手动检查并升级数据库结构。
	 *
	 * <p>启动时会自动做一次（{@code SchemaUpgradeRunner}），但「用户直接覆盖了程序、没重启」或者
	 * 「升级时数据库账号暂时没权限」这类情况，需要一个不重启就能重试的入口。
	 * 幂等：结构已经最新时什么都不做。
	 */
	@PostMapping("/schema/upgrade")
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	public SchemaUpgradeResult upgradeSchema() {
		SchemaUpgradeResult result = schemaUpgradeService.ensureUpToDate();
		log.info("手动结构升级：status={}，db={}，applied={}", result.getStatus(), result.getDbVersion(),
				result.getAppliedScripts());
		return result;
	}

	/**
	 * 检查更新：只读远端版本信息，不下载、不执行任何升级动作。
	 *
	 * <p>
	 * 两种来源，二选一：配了 update.manifest-url 就查自建清单，否则查 GitHub Releases
	 * （update.github-repo）。结果在服务端缓存 update.check-interval-hours 小时（默认 24），
	 * 避免频繁打 GitHub 触发未认证限流（60 次/小时/IP）；失败只缓存 1 小时，网络恢复后能较快重试，
	 * 且失败只置 error、不打扰前端。
	 * </p>
	 */
	@GetMapping("/update/check")
	@PreAuthorize("isAuthenticated()")
	public UpdateCheckView checkUpdate(@RequestParam(value = "force", defaultValue = "false") boolean force) {
		SystemInfo.SystemSetting setting = updateSetting();
		boolean enabled = setting == null || !Boolean.FALSE.equals(setting.getUpdateCheckEnabled());
		long intervalHours = setting != null && setting.getUpdateCheckIntervalHours() != null
				? Math.max(1, setting.getUpdateCheckIntervalHours()) : Math.max(1L, checkIntervalHours);
		long now = System.currentTimeMillis();
		long intervalMs = intervalHours * 3600_000L;
		long effectiveMs = lastCheckFailed ? Math.min(intervalMs, 3600_000L) : intervalMs;
		if (!force && cachedUpdate != null && now - updateCheckedAt < effectiveMs) {
			return cachedUpdate;
		}

		UpdateCheckView view = new UpdateCheckView();
		view.setCurrentVersion(currentVersion);
		if (!enabled) {
			view.setEnabled(false);
			cachedUpdate = view;
			updateCheckedAt = now;
			lastCheckFailed = false;
			return view;
		}

		String effectiveManifest = setting != null && StringUtils.hasText(setting.getUpdateManifestUrl())
				? setting.getUpdateManifestUrl() : manifestUrl;
		String effectiveRepo = setting != null && StringUtils.hasText(setting.getUpdateGithubRepo())
				? setting.getUpdateGithubRepo() : githubRepo;
		String effectiveApiBase = setting != null && StringUtils.hasText(setting.getUpdateApiBase())
				? setting.getUpdateApiBase() : githubApiBase;
		boolean useManifest = StringUtils.hasText(effectiveManifest);
		boolean useGithub = StringUtils.hasText(effectiveRepo);
		if (!useManifest && !useGithub) {
			view.setEnabled(false);
			cachedUpdate = view;
			updateCheckedAt = now;
			lastCheckFailed = false;
			return view;
		}

		view.setEnabled(true);
		try {
			if (useManifest) {
				fillFromManifest(view, effectiveManifest);
			}
			else {
				fillFromGithub(view, effectiveRepo, effectiveApiBase);
			}
			lastCheckFailed = false;
		}
		catch (Exception e) {
			view.setHasUpdate(false);
			view.setError(e.getMessage() == null ? "检查更新失败" : e.getMessage());
			lastCheckFailed = true;
		}
		cachedUpdate = view;
		updateCheckedAt = now;
		// 「检查更新」与公告中心联动：发现新版本时写一条管理员公告（同版本只写一次，见 NoticeService）
		recordUpdateNotice(view);
		return view;
	}

	/**
	 * 把更新检查结果同步成管理员公告。
	 *
	 * <p>这里必须吞掉异常：检查更新本身是只读的运维动作，公告写失败（库慢、表还没建）不该让
	 * 设置页的「检查更新」跟着报错。
	 */
	private void recordUpdateNotice(UpdateCheckView view) {
		try {
			noticeService.recordSystemUpdate(view);
		}
		catch (RuntimeException e) {
			log.warn("写入系统更新公告失败 version={}", view == null ? null : view.getLatestVersion(), e);
		}
	}

	/** 自建清单：{"version":"2.1.0","notes":"...","url":"..."} */
	private void fillFromManifest(UpdateCheckView view, String manifestUrl) throws Exception {
		HttpURLConnection connection = null;
		try {
			connection = (HttpURLConnection) new URL(manifestUrl.trim()).openConnection();
			connection.setConnectTimeout(5000);
			connection.setReadTimeout(5000);
			connection.setRequestProperty("Accept", "application/json");
			int status = connection.getResponseCode();
			if (status < 200 || status >= 300) {
				throw new IllegalStateException("更新清单返回 HTTP " + status);
			}
			try (InputStream input = connection.getInputStream()) {
				Map<String, Object> manifest = objectMapper.readValue(input, new TypeReference<Map<String, Object>>() {
				});
				String latest = asText(manifest.get("version"));
				view.setLatestVersion(latest);
				view.setNotes(truncate(asText(manifest.get("notes")), 800));
				view.setDownloadUrl(asText(manifest.get("url")));
				view.setPublishedAt(asText(manifest.get("publishedAt")));
				view.setHasUpdate(latest != null && compareVersion(latest, currentVersion) > 0);
			}
		}
		finally {
			if (connection != null) {
				connection.disconnect();
			}
		}
	}

	/** GitHub Releases：GET {api}/repos/{repo}/releases/latest */
	private void fillFromGithub(UpdateCheckView view, String githubRepo, String githubApiBase) throws Exception {
		String base = StringUtils.hasText(githubApiBase) ? githubApiBase.trim() : "https://api.github.com";
		String url = base.replaceAll("/+$", "") + "/repos/" + githubRepo.trim() + "/releases/latest";
		HttpURLConnection connection = null;
		try {
			connection = (HttpURLConnection) new URL(url).openConnection();
			connection.setConnectTimeout(5000);
			connection.setReadTimeout(5000);
			connection.setRequestProperty("Accept", "application/vnd.github+json");
			connection.setRequestProperty("User-Agent", "xuri-classroom/" + currentVersion);
			int status = connection.getResponseCode();
			if (status == 404) {
				throw new IllegalStateException("GitHub 仓库还没有 Release：" + githubRepo);
			}
			if (status < 200 || status >= 300) {
				throw new IllegalStateException("GitHub 返回 HTTP " + status);
			}
			try (InputStream input = connection.getInputStream()) {
				Map<String, Object> release = objectMapper.readValue(input, new TypeReference<Map<String, Object>>() {
				});
				String tag = asText(release.get("tag_name"));
				String latest = tag == null ? null : tag.replaceFirst("^[vV]", "");
				view.setLatestVersion(latest);
				// Release 正文可能很长，截断到 800 字，避免横幅撑爆
				view.setNotes(truncate(asText(release.get("body")), 800));
				view.setDownloadUrl(asText(release.get("html_url")));
				view.setPublishedAt(asText(release.get("published_at")));
				view.setHasUpdate(latest != null && compareVersion(latest, currentVersion) > 0);
			}
		}
		finally {
			if (connection != null) {
				connection.disconnect();
			}
		}
	}

	private static String asText(Object value) {
		return value == null ? null : String.valueOf(value);
	}

	private static String truncate(String text, int max) {
		if (text == null) {
			return null;
		}
		String trimmed = text.trim();
		return trimmed.length() <= max ? trimmed : trimmed.substring(0, max) + "…";
	}

	private int compareVersion(String left, String right) {
		String[] a = String.valueOf(left).replaceFirst("^[vV]", "").split("\\.");
		String[] b = String.valueOf(right).replaceFirst("^[vV]", "").split("\\.");
		int length = Math.max(a.length, b.length);
		for (int i = 0; i < length; i++) {
			int x = i < a.length ? parseInt(a[i]) : 0;
			int y = i < b.length ? parseInt(b[i]) : 0;
			if (x != y) {
				return Integer.compare(x, y);
			}
		}
		return 0;
	}

	private int parseInt(String value) {
		try {
			return Integer.parseInt(value.replaceAll("[^0-9].*$", ""));
		}
		catch (Exception ignored) {
			return 0;
		}
	}

	/**
	 * @return 当前系统信息
	 */
	@GetMapping
	public SystemInfo getSystemInfo() {
		return systemService.getSystemInfo();
	}

	/**
	 * 获取系统AI设置
	 * @return
	 */
	@GetMapping("/aiSetting")
	@PreAuthorize("hasRole('admin')")
	public SystemInfo.AiSetting getSystemAiSetting() {
		SystemInfo.AiSetting storedSetting = systemService.getSystemAiSetting();
		if (storedSetting == null) {
			return null;
		}

		// 不要直接修改持久化对象。MyBatis 可能会复用缓存中的对象，直接脱敏会导致
		// 后续 AI 调用也无法读取 API Key。
		SystemInfo.AiSetting response = new SystemInfo.AiSetting();
		response.setEnabled(storedSetting.getEnabled());
		response.setBaseUrl(storedSetting.getBaseUrl());
		response.setModels(storedSetting.getModels());
		response.setDefaultModel(storedSetting.getDefaultModel());
		response.setPrompt(storedSetting.getPrompt());
		// 限额：库里没填时回落到默认值，管理员在设置页看到的就是真正生效的数字；
		// 显式存 0 表示「不限」，原样返回 0（页面显示「不限」）
		response.setDailyTokenLimit(storedSetting.getDailyTokenLimit() == null
				? Integer.valueOf(AiUsageService.DEFAULT_DAILY_TOKEN_LIMIT) : storedSetting.getDailyTokenLimit());
		response.setPerUserDailyLimit(storedSetting.getPerUserDailyLimit() == null
				? Integer.valueOf(AiUsageService.DEFAULT_PER_USER_TOKEN_LIMIT) : storedSetting.getPerUserDailyLimit());
		// 每对话上限与限流同样回落到默认值：设置页要显示「真正生效的数字」，而不是一个空框
		response.setMaxChatTurns(storedSetting.getMaxChatTurns() == null
				? Integer.valueOf(AiUsageService.DEFAULT_MAX_CHAT_TURNS) : storedSetting.getMaxChatTurns());
		response.setMaxTurnChars(storedSetting.getMaxTurnChars() == null
				? Integer.valueOf(AiUsageService.DEFAULT_MAX_TURN_CHARS) : storedSetting.getMaxTurnChars());
		response.setRateLimitPerMinute(storedSetting.getRateLimitPerMinute() == null
				? Integer.valueOf(AiUsageService.DEFAULT_RATE_LIMIT_PER_MINUTE) : storedSetting.getRateLimitPerMinute());
		if (!StringUtils.hasText(response.getBaseUrl()) && !StringUtils.hasText(storedSetting.getApiKey())
				&& StringUtils.hasText(storedSetting.getToken())) {
			response.setBaseUrl("https://api.siliconflow.cn/v1");
		}
		return response;
	}

	/**
	 * 拉取服务商支持的模型列表，供系统设置 → AI 的「从服务商获取」按钮使用。
	 *
	 * <p>为什么用 POST 且允许带 body：管理员通常先改 Base URL / API Key，再点获取；
	 * 这时值还没保存。带上 `{baseUrl, apiKey}` 可以「先试再存」，API Key 留空则沿用已保存的。
	 * Key 全程只在服务端使用，响应里只有模型 id。
	 *
	 * @param preview 可空；只读 baseUrl / apiKey
	 * @return {baseUrl, models: [...], count}
	 */
	@PostMapping("/aiModels")
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	public Map<String, Object> aiModels(@RequestBody(required = false) SystemInfo.AiSetting preview) {
		List<String> models = aiGateway.listModels(preview);
		Map<String, Object> result = new LinkedHashMap<>();
		SystemInfo.AiSetting stored = systemService.getSystemAiSetting();
		result.put("baseUrl", preview != null && StringUtils.hasText(preview.getBaseUrl()) ? preview.getBaseUrl().trim()
				: (stored == null ? null : stored.getBaseUrl()));
		result.put("models", models);
		result.put("count", Integer.valueOf(models.size()));
		return result;
	}

	/**
	 * 获取脱敏后的第三方登录配置。
	 */
	@GetMapping("/oauthSetting")
	@PreAuthorize("hasRole('admin')")
	public OAuthSettingView getOAuthSetting() {
		return systemService.getOAuthSettingView();
	}

	/**
	 * 更新第三方登录配置。
	 */
	@PostMapping("/oauthSetting")
	@PreAuthorize("hasRole('admin')")
	public void updateOAuthSetting(@RequestBody OAuthSettingRequest request) {
		systemService.updateOAuthSetting(request);
	}

	/**
	 * 更新系统信息
	 * @param request 更新请求
	 */
	@PostMapping("/update")
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	public void updateSystemInfo(@RequestBody SystemInfoRequest request) {
		systemService.updateSystemInfo(request);
		// 更新源配置变更后立即失效缓存，设置页点「立即检查」能看到新结果
		cachedUpdate = null;
		updateCheckedAt = 0;
	}

	private SystemInfo.SystemSetting updateSetting() {
		try {
			SystemInfo info = systemService.getSystemInfo();
			return info == null ? null : info.getSetting();
		}
		catch (RuntimeException e) {
			return null;
		}
	}

	/**
	 * 获取系统角色列表
	 * @param query 角色查询请求
	 * @return
	 */
	@RequestMapping("/role/list")
	@PreAuthorize("hasAuthority('system:role:list')")
	public PaginationResponse<RoleView> roles(RoleQuery query) {
		return systemService.getRoles(query);
	}

	/**
	 * 角色候选（只读）：用户组/班级绑定角色时只需要「可选角色」。
	 *
	 * <p>不能复用 /role/list：那个接口返回 authorities，要 system:role:list；
	 * 只有组织/班级权限的账号打开用户组页时只需要角色名，不该因此拿到权限明细。
	 * @return 角色候选项（不含权限串）
	 */
	@GetMapping("/role/options")
	@PreAuthorize("hasAnyAuthority('system:role:list','system:dept:list','system:dept:update','org:list','class:list') or hasRole('admin')")
	public List<RoleOptionView> roleOptions() {
		return systemService.getRoleOptions();
	}

	/**
	 * 添加系统角色
	 * @param request 角色信息
	 */
	@PostMapping("/role/create")
	@PreAuthorize("hasAuthority('system:role:create')")
	public void createRole(@RequestBody RoleRequest request) {
		systemService.createRole(request);
	}

	/**
	 * 更新系统角色
	 * @param request 角色信息
	 */
	@PostMapping("/role/update")
	@PreAuthorize("hasAuthority('system:role:update')")
	public void updateRole(@RequestBody RoleRequest request) {
		systemService.updateRole(request);
	}

	/**
	 * 删除系统角色
	 * @param request 角色信息
	 */
	@PostMapping("/role/delete")
	@PreAuthorize("hasAuthority('system:role:delete')")
	public void deleteRole(@RequestBody RoleRequest request) {
		if (request.getId() == null) {
			return;
		}
		Long totalRoleObj = systemService.getRoles(new RoleQuery()).getTotal();
		long totalRoles = totalRoleObj == null ? 0 : totalRoleObj;
		if (totalRoles <= 1) {
			throw new ValidationException(
					messageSource.getMessage("system.role.delete.retainOne", null, LocaleContextHolder.getLocale()));
		}
		systemService.deleteRole(request);
	}

	/**
	 * 获取系统权限目录（按分组）。
	 * 数据来源是 PermissionEnum，包含中文名/分组/说明，供「角色权限矩阵」页面渲染；
	 * 比注解扫描多了「建议新增但尚未接入」的权限点。
	 * @return 按分组排列的权限目录
	 */
	@GetMapping("/permission/list")
	@PreAuthorize("hasAuthority('system:role:list') or hasRole('admin')")
	public List<PermissionEnum.PermissionGroupView> permissions() {
		return systemService.getPermissionCatalog();
	}

	/**
	 * 比对数据库和代码里面配置的权限
	 */
	@GetMapping("/permission/diff")
	@PreAuthorize("hasRole('admin')")
	public void extractCodeDiffDbPermissions() {
		systemService.extractCodeDiffDbPermissions();
	}

	/**
	 * 系统用户列表
	 * @param query 查询用户信息
	 * @return
	 */
	@RequestMapping("/user/list")
	@PreAuthorize("hasAuthority('system:user:list')")
	public PaginationResponse<UserView> roles(UserQuery query) {
		return userService.getUsers(query);
	}

	/**
	 * 只读用户候选：题库/考试授权选人、班级分配老师用。
	 *
	 * <p>与 /user/list 分开，避免把 system:user:list 的完整用户资料面暴露给只有 user:select 的角色。
	 */
	@GetMapping("/user/options")
	@PreAuthorize("hasAnyAuthority('system:user:list','user:select') or hasRole('admin')")
	public List<UserOptionView> userOptions(@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String userType) {
		return userService.listUserOptions(keyword, userType);
	}

	/**
	 * 创建系统用户
	 * @param request
	 */
	@PostMapping("/user/create")
	// 入口放行三档权限，具体能建学员还是老师由 UserServiceImpl#assertRoleGrantScope 判断；
	// 否则只配 create:student 的角色连接口都进不来。
	@PreAuthorize("hasAnyAuthority('system:user:create','system:user:create:student','system:user:create:teacher') or hasRole('admin')")
	public void createUser(@RequestBody @Valid UserRequest request) {
		userService.createSystemUser(request);
	}

	/**
	 * 更新系统用户
	 * @param request
	 */
	@PostMapping("/user/update")
	@PreAuthorize("hasAuthority('system:user:update')")
	public void updateUser(@RequestBody @Valid UserRequest request) {
		userService.updateUser(request);
	}

	/**
	 * 更新用户岗位信息
	 * @param request
	 */
	@PostMapping("/user/updatePosition")
	@PreAuthorize("hasRole('admin')")
	public void updateUserPosition(@RequestBody @Valid UserRequest request) {
		userService.updateUserPosition(request);
	}

	/**
	 * 删除用户
	 * @param request
	 */
	@PostMapping("/user/delete")
	@PreAuthorize("hasAuthority('system:user:delete')")
	public void deleteUser(@RequestBody UserRequest request) {
		if (request.getId() == null) {
			return;
		}
		List<String> userIds = Arrays.stream(request.getId().split(",")).map(String::trim).filter(id -> !id.isEmpty())
				.distinct().collect(Collectors.toList());
		if (userIds.isEmpty()) {
			return;
		}
		String currentUserId = SecurityContextUtils.getUserId();
		if (userIds.contains(currentUserId)) {
			throw new ValidationException(
					messageSource.getMessage("system.user.delete.self", null, LocaleContextHolder.getLocale()));
		}
		Long total = userService.getUsers(new UserQuery()).getTotal();
		long totalUsers = total == null ? 0 : total;
		if (totalUsers - userIds.size() < 1) {
			throw new ValidationException(
					messageSource.getMessage("system.user.delete.retainOne", null, LocaleContextHolder.getLocale()));
		}
		userIds.forEach(userService::deleteUser);
	}

	/**
	 * 检查登录名是否存在
	 * @param username 登录用户名
	 * @return
	 */
	@GetMapping("/checkUsernameExist")
	public boolean checkUsernameExist(String username) {
		return userService.checkUsernameExist(username);
	}

	/**
	 * 查询岗位列表
	 * @param query
	 * @return
	 */
	@GetMapping("/position/list")
	@PreAuthorize("hasRole('admin')")
	public PaginationResponse<PositionView> listPosition(PositionQuery query) {
		return positionService.listPosition(query);
	}

	/**
	 * 添加岗位
	 * @param request
	 */
	@PostMapping("/position/create")
	@PreAuthorize("hasRole('admin')")
	public void addPosition(@RequestBody PositionRequest request) {
		positionService.addPosition(request);
	}

	/**
	 * 更新岗位信息
	 * @param request
	 */
	@PostMapping("/position/update")
	@PreAuthorize("hasRole('admin')")
	public void updatePosition(@RequestBody PositionRequest request) {
		positionService.updatePosition(request);
	}

	/**
	 * 删除岗位信息
	 * @param request
	 */
	@PostMapping("/position/delete")
	@PreAuthorize("hasRole('admin')")
	public void deletePosition(@RequestBody PositionRequest request) {
		positionService.deletePosition(request.getId());
	}

	/**
	 * 获取组织节点列表（用户组 / 班级）。
	 * @param deptType org=用户组(教职工) class=班级(学员)；为空返回全部（走缓存）
	 * @return
	 */
	@GetMapping("/dept/list")
	// org:list 是只读组织树：老师要在题库/考试授权弹窗里选组，但不应因此获得用户组管理菜单
	@PreAuthorize("hasAnyAuthority('system:dept:list','org:list') or hasRole('admin')")
	public List<DeptView> listDept(@RequestParam(required = false) String deptType) {
		if (!StringUtils.hasText(deptType)) {
			// 不带类型：仍是全量组织树，且命中 listDept 上的 @Cacheable（condition = "#p0 == null"）
			return deptService.listDept(null);
		}
		SelectDeptRequest request = new SelectDeptRequest();
		request.setDeptType(deptType);
		return deptService.listDept(request);
	}

	@PostMapping("/dept/create")
	@PreAuthorize("hasAuthority('system:dept:create')")
	public void addOrg(@RequestBody DeptRequest request) {
		deptService.addDept(request);
	}

	@PostMapping("/dept/update")
	@PreAuthorize("hasAuthority('system:dept:update')")
	public void updateOrg(@RequestBody DeptRequest request) {
		deptService.updateDept(request);
	}

	/**
	 * 删除用户组前的预检：子组、成员数量 / 姓名、是否最后一个组。
	 * 只给「能删组」的人看，避免把成员名单暴露给只读角色。
	 */
	@GetMapping("/dept/delete-check")
	@PreAuthorize("hasAuthority('system:dept:delete') or hasRole('admin')")
	public DeptDeleteCheckView deleteCheck(@RequestParam String id) {
		return deptService.deleteCheck(id);
	}

	/**
	 * 删除用户组。成员由 {@link DeptDeleteRequest} 的 memberAction 决定：
	 * MOVE 迁到目标组，UNASSIGN 移出分组；只传 id 时仅在组内无成员时成功。
	 *
	 * <p>不再限制「系统里至少保留一个组」：最后一个组删掉后，成员会变成未分组，
	 * 这是可接受的业务状态（旧限制会把「只剩一个组 + 组里还有人」永远卡死）。
	 */
	@PostMapping("/dept/delete")
	@PreAuthorize("hasAuthority('system:dept:delete')")
	public void deleteOrg(@RequestBody DeptDeleteRequest request) {
		if (request == null || !StringUtils.hasText(request.getId())) {
			return;
		}
		deptService.deleteDept(request);
	}

	@PostMapping("/dept/sort")
	@PreAuthorize("hasAuthority('system:dept:create')")
	public void sortOrg(@RequestBody DeptSortRequest request) {
		deptService.sortDept(request);
	}

	/**
	 * 手动清理过期的匿名答卷（按系统设置里的保留天数）。
	 *
	 * <p>定时任务每天 03:30 自动跑一次；这里是管理员在「系统设置」里点「立即清理」的入口。
	 * 返回 {@code {deleted: n}}，前端用它提示清理了多少条。
	 */
	@PostMapping("/anonymous/cleanup")
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	public Map<String, Object> cleanupAnonymousAnswers() {
		Map<String, Object> result = new HashMap<>();
		result.put("deleted", anonymousCleanupService.runNow());
		return result;
	}

	/**
	 * 获取字典项列表
	 * @param query 字典项分页参数
	 * @return
	 */
	@GetMapping("/dict/list")
	@PreAuthorize("hasAuthority('system:dict:list')")
	public PaginationResponse<CommDictView> listDict(CommDictQuery query) {
		return dictService.listDict(query);
	}

	/**
	 * 创建字典项
	 * @param request
	 */
	@PostMapping("/dict/create")
	@PreAuthorize("hasAuthority('system:dict:create')")
	public void addDict(@RequestBody CommDictRequest request) {
		dictService.addDict(request);
	}

	/**
	 * 更新字典项
	 * @param request
	 */
	@PostMapping("/dict/update")
	@PreAuthorize("hasAuthority('system:dict:update')")
	public void updateDict(@RequestBody CommDictRequest request) {
		dictService.updateDict(request);
	}

	/**
	 * 删除字典项
	 * @param request
	 */
	@PostMapping("/dict/delete")
	@PreAuthorize("hasAuthority('system:dict:delete')")
	public void deleteDict(@RequestBody CommDictRequest request) {
		dictService.deleteDict(request.getId());
	}

	/**
	 * 获取字典条目列表
	 * @param query
	 * @return
	 */
	@GetMapping("/dictItem/list")
	@PreAuthorize("hasAuthority('system:dictItem:list')")
	public PaginationResponse<CommDictItemView> listDictItem(CommDictItemQuery query) {
		return dictService.listDictItem(query);
	}

	/**
	 * 添加或者修改字典条目
	 * @param request
	 */
	@PostMapping("/dictItem/create")
	@PreAuthorize("hasAuthority('system:dictItem:create')")
	public void createDictItem(@RequestBody CommDictItemRequest request) {
		dictService.saveOrUpdateDictItem(request);
	}

	/**
	 * 添加或者修改字典条目
	 * @param request
	 */
	@PostMapping("/dictItem/update")
	@PreAuthorize("hasAuthority('system:dictItem:update')")
	public void updateItem(@RequestBody CommDictItemRequest request) {
		dictService.saveOrUpdateDictItem(request);
	}

	/**
	 * 导入字典条目
	 * @param request
	 */
	@PostMapping("/dictItem/import")
	@PreAuthorize("hasAuthority('system:dictItem:import')")
	public void importDictItem(CommDictItemRequest request) {
		dictService.importDictItem(request);
	}

	/**
	 * 删除字典条目
	 * @param request
	 */
	@PostMapping("/dictItem/delete")
	@PreAuthorize("hasAuthority('system:dictItem:delete')")
	public void deleteDictItem(@RequestBody CommDictItemRequest request) {
		dictService.deleteDictItem(request.getId());
	}


	/**
	 * 导出诊断日志（zip）。
	 *
	 * <p>用户报障时往往只有一句「服务出了点问题」，管理员拿不到现场。这里把最近 N 天的应用日志
	 * 与一份环境摘要打包下载，用户可以直接发出来；日志没有落盘时 zip 里仍会写明去哪里取。
	 * @param days 最近多少天（1~30）
	 */
	@GetMapping("/logs/export")
	@PreAuthorize("hasAuthority('system:log:list')")
	public ResponseEntity<Resource> exportDiagnostics(@RequestParam(defaultValue = "7") int days) {
		byte[] zip = diagnosticsExporter.export(Math.min(Math.max(days, 1), 30));
		String fileName = "diagnostics-"
				+ java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")) + ".zip";
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
				.contentType(MediaType.parseMediaType("application/zip")).contentLength(zip.length)
				.body(new ByteArrayResource(zip));
	}
}