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
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;

import jakarta.validation.Valid;
import jakarta.validation.ValidationException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;





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


	private final DiagnosticsExporter diagnosticsExporter;


	private final AnonymousCleanupService anonymousCleanupService;

	private final ObjectMapper objectMapper;


	private final SchemaUpgradeService schemaUpgradeService;


	private final NoticeService noticeService;


	private final AiGateway aiGateway;

	private final UpdateDownloadService updateDownloadService;

	@Value("${version}")
	private String currentVersion;

	@Value("${update.manifest-url:}")
	private String manifestUrl;


	@Value("${update.github-repo:}")
	private String githubRepo;


	@Value("${update.github-api-base:https://api.github.com}")
	private String githubApiBase;


	@Value("${update.check-interval-hours:24}")
	private long checkIntervalHours;

	@Value("${update.download-proxy:}")
	private String downloadProxy;


	@Value("${file-storage.local.root-path:./files}")
	private String fileRootPath;

	private volatile UpdateCheckView cachedUpdate;

	private volatile long updateCheckedAt;


	private volatile boolean lastCheckFailed;

	@GetMapping("/version")
	public Map<String, Object> version() {
		Map<String, Object> view = new LinkedHashMap<>();
		view.put("version", currentVersion);

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

	/** 手动检查并升级数据库结构 */
	@PostMapping("/schema/upgrade")
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	public SchemaUpgradeResult upgradeSchema() {
		SchemaUpgradeResult result = schemaUpgradeService.ensureUpToDate();
		log.info("手动结构升级：status={}，db={}，applied={}", result.getStatus(), result.getDbVersion(),
				result.getAppliedScripts());
		return result;
	}











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
		if (!force && cachedUpdate == null) {
			SystemInfo.UpdateStatus stored = systemService.getUpdateStatus();
			if (stored != null && stored.getCheckedAt() != null && now - stored.getCheckedAt() < effectiveMs
					&& !Boolean.TRUE.equals(stored.getHasUpdate())) {
				UpdateCheckView view = new UpdateCheckView();
				view.setCheckedAt(stored.getCheckedAt());
				view.setCurrentVersion(stored.getCurrentVersion());
				view.setLatestVersion(stored.getLatestVersion());
				view.setHasUpdate(Boolean.TRUE.equals(stored.getHasUpdate()));
				view.setEnabled(Boolean.TRUE.equals(stored.getEnabled()));
				view.setError(stored.getError());
				view.setChannel(stored.getChannel());
				cachedUpdate = view;
				updateCheckedAt = stored.getCheckedAt();
				return view;
			}
		}

		UpdateCheckView view = new UpdateCheckView();
		view.setCurrentVersion(currentVersion);
		if (!enabled) {
			view.setEnabled(false);
			lastCheckFailed = false;
			rememberUpdate(view, now);
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
			lastCheckFailed = false;
			rememberUpdate(view, now);
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
		rememberUpdate(view, now);

		recordUpdateNotice(view);
		return view;
	}

	private SystemInfo.UpdateStatus toStoredStatus(UpdateCheckView view) {
		SystemInfo.UpdateStatus status = new SystemInfo.UpdateStatus();
		status.setCheckedAt(view.getCheckedAt());
		status.setCurrentVersion(view.getCurrentVersion());
		status.setLatestVersion(view.getLatestVersion());
		status.setHasUpdate(view.isHasUpdate());
		status.setEnabled(view.isEnabled());
		status.setError(truncate(view.getError(), 500));
		status.setChannel(view.getChannel());
		return status;
	}

	private void rememberUpdate(UpdateCheckView view, long now) {
		view.setCheckedAt(now);
		cachedUpdate = view;
		updateCheckedAt = now;
		try {
			systemService.saveUpdateStatus(toStoredStatus(view));
		}
		catch (RuntimeException e) {
			log.warn("保存更新检查状态失败", e);
		}
	}

	/** 把更新检查结果同步成管理员公告 */
	private void recordUpdateNotice(UpdateCheckView view) {
		try {
			noticeService.recordSystemUpdate(view);
		}
		catch (RuntimeException e) {
			log.warn("写入系统更新公告失败 version={}", view == null ? null : view.getLatestVersion(), e);
		}
	}

	/** 自建清单：{"version":"2.1.0","notes":"...","url":"...","assets":{"jar":{...}}} */
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
				view.setChannel(asText(manifest.get("channel")));
				view.setHasUpdate(latest != null && compareVersion(latest, currentVersion) > 0);

				Object rawAssets = manifest.get("assets");
				if (rawAssets instanceof Map<?, ?> map) {
					Map<String, UpdateCheckView.Asset> assets = new LinkedHashMap<>();
					for (Map.Entry<?, ?> entry : map.entrySet()) {
						if (!(entry.getValue() instanceof Map<?, ?> item)) {
							continue;
						}
						UpdateCheckView.Asset asset = new UpdateCheckView.Asset();
						asset.setFile(asText(item.get("file")));
						asset.setUrl(asText(item.get("url")));
						asset.setSha256(asText(item.get("sha256")));
						Object size = item.get("size");
						asset.setSize(size instanceof Number number ? number.longValue() : null);
						assets.put(String.valueOf(entry.getKey()), asset);
					}
					view.setAssets(assets);
				}
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

				view.setNotes(truncate(asText(release.get("body")), 800));
				view.setDownloadUrl(asText(release.get("html_url")));
				view.setPublishedAt(asText(release.get("published_at")));
				view.setHasUpdate(latest != null && compareVersion(latest, currentVersion) > 0);

				Map<String, UpdateCheckView.Asset> releaseAssets = new LinkedHashMap<>();
				if (release.get("assets") instanceof List<?> list) {
					for (Object item : list) {
						if (!(item instanceof Map<?, ?> asset)) {
							continue;
						}
						String name = asText(asset.get("name"));
						String assetUrl = asText(asset.get("browser_download_url"));
						if (!StringUtils.hasText(name) || !StringUtils.hasText(assetUrl)) {
							continue;
						}
						String key = name.endsWith(".jar") ? "jar"
								: name.contains("windows") ? "windows"
										: name.contains("linux") ? "linux" : name.contains("docker") ? "docker" : null;
						if (key == null || releaseAssets.containsKey(key)) {
							continue;
						}
						UpdateCheckView.Asset resolved = new UpdateCheckView.Asset();
						resolved.setFile(name);
						resolved.setUrl(assetUrl);
						Object size = asset.get("size");
						resolved.setSize(size instanceof Number number ? number.longValue() : null);
						releaseAssets.put(key, resolved);
					}
				}
				view.setAssets(releaseAssets);

				String manifestUrl = findUpdateManifest(release);
				if (manifestUrl != null) {
					try {
						fillFromUpdateManifest(view, manifestUrl);
					}
					catch (Exception ignored) {
						// update.json 拉取失败时保留 Release assets，至少保证 jar 下地址可用
					}
				}
			}
		}
		finally {
			if (connection != null) {
				connection.disconnect();
			}
		}
	}

	/** 从 Release 的 assets 里找 update.json 的下载地址 */
	private static String findUpdateManifest(Map<String, Object> release) {
		Object raw = release.get("assets");
		if (!(raw instanceof List<?> list)) {
			return null;
		}
		for (Object item : list) {
			if (!(item instanceof Map<?, ?> asset)) {
				continue;
			}
			if (!"update.json".equals(asText(asset.get("name")))) {
				continue;
			}
			String url = asText(asset.get("browser_download_url"));
			if (url != null) {
				return url;
			}
		}
		return null;
	}

	/** 解析 update.json：版本/通道/说明/各平台资产 */
	private void fillFromUpdateManifest(UpdateCheckView view, String manifestUrl) {
		if (downloadProxy != null && !downloadProxy.isBlank() && manifestUrl != null
				&& manifestUrl.startsWith("https://github.com/")) {
			String base = downloadProxy.trim();
			manifestUrl = (base.endsWith("/") ? base : base + "/") + manifestUrl;
		}
		HttpURLConnection connection = null;
		try {
			connection = (HttpURLConnection) new URL(manifestUrl).openConnection();
			connection.setConnectTimeout(5000);
			connection.setReadTimeout(8000);
			connection.setRequestProperty("Accept", "application/json");
			connection.setRequestProperty("User-Agent", "xuri-classroom/" + currentVersion);
			if (connection.getResponseCode() / 100 != 2) {
				return;
			}
			try (InputStream input = connection.getInputStream()) {
				Map<String, Object> manifest = objectMapper.readValue(input, new TypeReference<Map<String, Object>>() {
				});
				String version = asText(manifest.get("version"));
				if (StringUtils.hasText(version)) {
					view.setLatestVersion(version);
					view.setHasUpdate(compareVersion(version, currentVersion) > 0);
				}
				view.setChannel(asText(manifest.get("channel")));
				String notes = asText(manifest.get("notes"));
				if (StringUtils.hasText(notes)) {
					view.setNotes(truncate(notes, 800));
				}
				Object raw = manifest.get("assets");
				if (raw instanceof Map<?, ?> map) {
					Map<String, UpdateCheckView.Asset> assets = new LinkedHashMap<>();
					for (Map.Entry<?, ?> entry : map.entrySet()) {
						if (!(entry.getValue() instanceof Map<?, ?> item)) {
							continue;
						}
						UpdateCheckView.Asset asset = new UpdateCheckView.Asset();
						asset.setFile(asText(item.get("file")));
						asset.setUrl(asText(item.get("url")));
						asset.setSha256(asText(item.get("sha256")));
						Object size = item.get("size");
						asset.setSize(size instanceof Number number ? number.longValue() : null);
						assets.put(String.valueOf(entry.getKey()), asset);
					}
					view.setAssets(assets);
				}
			}
		}
		catch (Exception e) {
			log.warn("解析 update.json 失败 url={}", manifestUrl, e);
		}
		finally {
			if (connection != null) {
				connection.disconnect();
			}
		}
	}









	@GetMapping("/update/pending")
	@PreAuthorize("hasAuthority('system:setting:update')")
	public Map<String, Object> updatePending() {
		Path dir = Paths.get(fileRootPath, "update").toAbsolutePath().normalize();
		Path flag = dir.resolve("apply.flag");
		Path jar = dir.resolve("app.jar");
		Map<String, Object> result = new LinkedHashMap<>();
		boolean pending = Files.isRegularFile(flag);
		result.put("pending", pending);
		result.put("canApply", updateDownloadService.canApply());
		try {
			if (pending) {
				for (String line : Files.readString(flag, StandardCharsets.UTF_8).split("\\n")) {
					int eq = line.indexOf('=');
					if (eq > 0) {
						result.put(line.substring(0, eq).trim(), line.substring(eq + 1).trim());
					}
				}
			}
			if (Files.isRegularFile(jar)) {
				result.put("size", Files.size(jar));
				result.put("downloadedAt", Files.getLastModifiedTime(jar).toMillis());
			}
		}
		catch (Exception e) {
			log.warn("读取更新状态失败", e);
		}
		return result;
	}










	@PreAuthorize("hasAuthority('system:setting:update')")
	@PostMapping("/update/download")
	public UpdateDownloadStatus downloadUpdate() {
		UpdateCheckView view = checkUpdate(true);
		Map<String, UpdateCheckView.Asset> assets = view.getAssets();
		UpdateCheckView.Asset asset = assets == null ? null : assets.get("jar");
		if (asset == null || !StringUtils.hasText(asset.getUrl())) {
			throw new ValidationException("这个版本没有可下载的 jar：Release 里没带 update.json，或里面缺 jar 资产");
		}
		return updateDownloadService.start(view.getLatestVersion(), asset);
	}

	@PreAuthorize("hasAuthority('system:setting:update')")
	@GetMapping("/update/download/status")
	public UpdateDownloadStatus downloadStatus() {
		return updateDownloadService.status();
	}

	@PreAuthorize("hasAuthority('system:setting:update')")
	@GetMapping("/update/downloads")
	public Map<String, Object> downloadHistory() {
		List<Map<String, Object>> items = updateDownloadService.history();
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("items", items);
		result.put("count", items.size());
		return result;
	}

	@PreAuthorize("hasAuthority('system:setting:update')")
	@DeleteMapping("/update/downloads/{version}")
	public void deleteDownload(@PathVariable String version) {
		updateDownloadService.delete(version);
	}

	@PreAuthorize("hasAuthority('system:setting:update')")
	@PostMapping("/update/downloads/delete")
	public void deleteDownloadPost(@RequestBody Map<String, String> body) {
		updateDownloadService.delete(body == null ? null : body.get("version"));
	}

	@PreAuthorize("hasAuthority('system:setting:update')")
	@PostMapping("/update/downloads/clear")
	public void clearDownloads() {
		updateDownloadService.clear();
	}

	@PreAuthorize("hasAuthority('system:setting:update')")
	@PostMapping("/update/apply")
	public Map<String, Object> applyUpdate() {
		return updateDownloadService.apply();
	}

	/** 跟随重定向把远端文件抓到本地（GitHub Release 会 302 到 objects.githubusercontent.com） */
	private void downloadTo(String url, Path target) throws Exception {
		String current = url;
		for (int hop = 0; hop < 5; hop++) {
			HttpURLConnection connection = (HttpURLConnection) new URL(current).openConnection();
			connection.setConnectTimeout(10000);
			connection.setReadTimeout(60000);
			connection.setInstanceFollowRedirects(false);
			connection.setRequestProperty("User-Agent", "xuri-classroom/" + currentVersion);
			int status = connection.getResponseCode();
			if (status >= 300 && status < 400) {
				String location = connection.getHeaderField("Location");
				connection.disconnect();
				if (!StringUtils.hasText(location)) {
					throw new IllegalStateException("重定向没有 Location");
				}
				current = location;
				continue;
			}
			if (status != 200) {
				connection.disconnect();
				throw new IllegalStateException("下载返回 HTTP " + status);
			}
			try (InputStream input = connection.getInputStream();
					OutputStream output = Files.newOutputStream(target, StandardOpenOption.CREATE,
							StandardOpenOption.TRUNCATE_EXISTING)) {
				input.transferTo(output);
			}
			finally {
				connection.disconnect();
			}
			return;
		}
		throw new IllegalStateException("重定向次数过多");
	}

	private static String sha256Of(Path file) throws Exception {
		MessageDigest digest = MessageDigest.getInstance("SHA-256");
		try (InputStream input = Files.newInputStream(file)) {
			byte[] buffer = new byte[8192];
			int read;
			while ((read = input.read(buffer)) > 0) {
				digest.update(buffer, 0, read);
			}
		}
		return HexFormat.of().formatHex(digest.digest());
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

	/** 返回 当前系统信息；返回 当前系统信息 */
	@GetMapping
	public SystemInfo getSystemInfo() {
		return systemService.getSystemInfo();
	}





	@GetMapping("/aiSetting")
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	public SystemInfo.AiSetting getSystemAiSetting() {
		SystemInfo.AiSetting storedSetting = systemService.getSystemAiSetting();
		if (storedSetting == null) {
			return null;
		}



		SystemInfo.AiSetting response = new SystemInfo.AiSetting();
		response.setEnabled(storedSetting.getEnabled());
		response.setProvider(storedSetting.getProvider());
		response.setDisplayName(storedSetting.getDisplayName());
		response.setBaseUrl(storedSetting.getBaseUrl());
		response.setModels(storedSetting.getModels());
		response.setModelMeta(storedSetting.getModelMeta());
		response.setDefaultModel(storedSetting.getDefaultModel());
		response.setPrompt(storedSetting.getPrompt());


		response.setDailyTokenLimit(storedSetting.getDailyTokenLimit() == null
				? Integer.valueOf(AiUsageService.DEFAULT_DAILY_TOKEN_LIMIT) : storedSetting.getDailyTokenLimit());
		response.setPerUserDailyLimit(storedSetting.getPerUserDailyLimit() == null
				? Integer.valueOf(AiUsageService.DEFAULT_PER_USER_TOKEN_LIMIT) : storedSetting.getPerUserDailyLimit());

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

	/** 拉取服务商支持的模型列表，供系统设置 → AI 的「从服务商获取」按钮使用；返回 {baseUrl, models: [...], count} */
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




	@GetMapping("/oauthSetting")
	@PreAuthorize("hasRole('admin')")
	public OAuthSettingView getOAuthSetting() {
		return systemService.getOAuthSettingView();
	}




	@PostMapping("/oauthSetting")
	@PreAuthorize("hasRole('admin')")
	public void updateOAuthSetting(@RequestBody OAuthSettingRequest request) {
		systemService.updateOAuthSetting(request);
	}

	/** 更新系统信息 */
	@PostMapping("/update")
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	public void updateSystemInfo(@RequestBody SystemInfoRequest request) {
		systemService.updateSystemInfo(request);

		cachedUpdate = null;
		updateCheckedAt = 0;
		systemService.clearUpdateStatus();
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






	@RequestMapping("/role/list")
	@PreAuthorize("hasAuthority('system:role:list')")
	public PaginationResponse<RoleView> roles(RoleQuery query) {
		return systemService.getRoles(query);
	}

	/** 角色候选（只读）：用户组/班级绑定角色时只需要「可选角色」；返回 角色候选项（不含权限串） */
	@GetMapping("/role/options")
	@PreAuthorize("hasAnyAuthority('system:role:list','system:dept:list','system:dept:update','org:list','class:list') or hasRole('admin')")
	public List<RoleOptionView> roleOptions() {
		return systemService.getRoleOptions();
	}





	@PostMapping("/role/create")
	@PreAuthorize("hasAuthority('system:role:create')")
	public void createRole(@RequestBody RoleRequest request) {
		systemService.createRole(request);
	}





	@PostMapping("/role/update")
	@PreAuthorize("hasAuthority('system:role:update')")
	public void updateRole(@RequestBody RoleRequest request) {
		systemService.updateRole(request);
	}





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

	/** 获取系统权限目录（按分组）；返回 按分组排列的权限目录 */
	@GetMapping("/permission/list")
	@PreAuthorize("hasAuthority('system:role:list') or hasRole('admin')")
	public List<PermissionEnum.PermissionGroupView> permissions() {
		return systemService.getPermissionCatalog();
	}




	@GetMapping("/permission/diff")
	@PreAuthorize("hasRole('admin')")
	public void extractCodeDiffDbPermissions() {
		systemService.extractCodeDiffDbPermissions();
	}






	@RequestMapping("/user/list")
	@PreAuthorize("hasAuthority('system:user:list')")
	public PaginationResponse<UserView> roles(UserQuery query) {
		return userService.getUsers(query);
	}

	/** 只读用户候选：题库/考试授权选人、班级分配老师用 */
	@GetMapping("/user/options")
	@PreAuthorize("hasAnyAuthority('system:user:list','user:select') or hasRole('admin')")
	public List<UserOptionView> userOptions(@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String userType) {
		return userService.listUserOptions(keyword, userType);
	}





	@PostMapping("/user/create")


	@PreAuthorize("hasAnyAuthority('system:user:create','system:user:create:student','system:user:create:teacher') or hasRole('admin')")
	public void createUser(@RequestBody @Valid UserRequest request) {
		userService.createSystemUser(request);
	}





	@PostMapping("/user/update")
	@PreAuthorize("hasAuthority('system:user:update')")
	public void updateUser(@RequestBody @Valid UserRequest request) {
		userService.updateUser(request);
	}





	@PostMapping("/user/updatePosition")
	@PreAuthorize("hasRole('admin')")
	public void updateUserPosition(@RequestBody @Valid UserRequest request) {
		userService.updateUserPosition(request);
	}





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

	/** 检查登录名是否存在 */
	@GetMapping("/checkUsernameExist")
	public boolean checkUsernameExist(String username) {
		return userService.checkUsernameExist(username);
	}






	@GetMapping("/position/list")
	@PreAuthorize("hasRole('admin')")
	public PaginationResponse<PositionView> listPosition(PositionQuery query) {
		return positionService.listPosition(query);
	}





	@PostMapping("/position/create")
	@PreAuthorize("hasRole('admin')")
	public void addPosition(@RequestBody PositionRequest request) {
		positionService.addPosition(request);
	}





	@PostMapping("/position/update")
	@PreAuthorize("hasRole('admin')")
	public void updatePosition(@RequestBody PositionRequest request) {
		positionService.updatePosition(request);
	}





	@PostMapping("/position/delete")
	@PreAuthorize("hasRole('admin')")
	public void deletePosition(@RequestBody PositionRequest request) {
		positionService.deletePosition(request.getId());
	}






	@GetMapping("/dept/list")
	// org:list 是只读组织树：老师要在题库/考试授权弹窗里选组，但不应因此获得用户组管理菜单
	@PreAuthorize("hasAnyAuthority('system:dept:list','org:list') or hasRole('admin')")
	public List<DeptView> listDept(@RequestParam(required = false) String deptType) {
		if (!StringUtils.hasText(deptType)) {

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

	/** 删除用户组前的预检：子组、成员数量 / 姓名、是否最后一个组 */
	@GetMapping("/dept/delete-check")
	@PreAuthorize("hasAuthority('system:dept:delete') or hasRole('admin')")
	public DeptDeleteCheckView deleteCheck(@RequestParam String id) {
		return deptService.deleteCheck(id);
	}








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

	/** 手动清理过期的匿名答卷（按系统设置里的保留天数） */
	@PostMapping("/anonymous/cleanup")
	@PreAuthorize("hasRole('admin') or hasAuthority('system:setting:update')")
	public Map<String, Object> cleanupAnonymousAnswers() {
		Map<String, Object> result = new HashMap<>();
		result.put("deleted", anonymousCleanupService.runNow());
		return result;
	}






	@GetMapping("/dict/list")
	@PreAuthorize("hasAuthority('system:dict:list')")
	public PaginationResponse<CommDictView> listDict(CommDictQuery query) {
		return dictService.listDict(query);
	}





	@PostMapping("/dict/create")
	@PreAuthorize("hasAuthority('system:dict:create')")
	public void addDict(@RequestBody CommDictRequest request) {
		dictService.addDict(request);
	}





	@PostMapping("/dict/update")
	@PreAuthorize("hasAuthority('system:dict:update')")
	public void updateDict(@RequestBody CommDictRequest request) {
		dictService.updateDict(request);
	}





	@PostMapping("/dict/delete")
	@PreAuthorize("hasAuthority('system:dict:delete')")
	public void deleteDict(@RequestBody CommDictRequest request) {
		dictService.deleteDict(request.getId());
	}






	@GetMapping("/dictItem/list")
	@PreAuthorize("hasAuthority('system:dictItem:list')")
	public PaginationResponse<CommDictItemView> listDictItem(CommDictItemQuery query) {
		return dictService.listDictItem(query);
	}





	@PostMapping("/dictItem/create")
	@PreAuthorize("hasAuthority('system:dictItem:create')")
	public void createDictItem(@RequestBody CommDictItemRequest request) {
		dictService.saveOrUpdateDictItem(request);
	}





	@PostMapping("/dictItem/update")
	@PreAuthorize("hasAuthority('system:dictItem:update')")
	public void updateItem(@RequestBody CommDictItemRequest request) {
		dictService.saveOrUpdateDictItem(request);
	}





	@PostMapping("/dictItem/import")
	@PreAuthorize("hasAuthority('system:dictItem:import')")
	public void importDictItem(CommDictItemRequest request) {
		dictService.importDictItem(request);
	}





	@PostMapping("/dictItem/delete")
	@PreAuthorize("hasAuthority('system:dictItem:delete')")
	public void deleteDictItem(@RequestBody CommDictItemRequest request) {
		dictService.deleteDictItem(request.getId());
	}









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