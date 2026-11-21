package cn.surveyking.server.api;

import cn.surveyking.server.domain.dto.UpdateCheckView;
import cn.surveyking.server.domain.dto.UpdateDownloadStatus;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** 更新包后台下载、进度、重试与历史文件管理。 */
@Slf4j
@Service
public class UpdateDownloadService {

	@Value("${file-storage.local.root-path:./files}")
	private String fileRootPath;

	@Value("${update.apply-enabled:true}")
	private boolean applyEnabled;

	@Value("${update.apply-jar-path:}")
	private String applyJarPath;

	@Value("${update.download-proxy:}")
	private String downloadProxy;

	@Value("${update.download-mirrors:}")
	private String downloadMirrors;

	private final ExecutorService executor = Executors.newSingleThreadExecutor(runnable -> {
		Thread thread = new Thread(runnable, "update-download");
		thread.setDaemon(true);
		return thread;
	});

	private final Object lock = new Object();

	private UpdateDownloadStatus status = new UpdateDownloadStatus();

	@PreDestroy
	public void shutdown() {
		executor.shutdownNow();
	}

	public UpdateDownloadStatus start(String version, UpdateCheckView.Asset asset) {
		if (version == null || !version.matches("[0-9A-Za-z._-]+")) {
			throw new IllegalArgumentException("版本号不合法");
		}
		if (asset == null || asset.getUrl() == null || asset.getUrl().isBlank()) {
			throw new IllegalArgumentException("没有可下载的 jar");
		}
		synchronized (lock) {
			if (running(status)) {
				return copy(status);
			}
			UpdateDownloadStatus next = new UpdateDownloadStatus();
			next.setPhase("downloading");
			next.setVersion(version);
			next.setTotalBytes(asset.getSize());
			next.setAttempt(1);
			next.setMaxAttempts(3);
			next.setStartedAt(System.currentTimeMillis());
			status = next;
			executor.submit(() -> run(version, asset));
			return copy(status);
		}
	}

	public UpdateDownloadStatus status() {
		synchronized (lock) {
			return copy(status);
		}
	}

	public boolean canApply() {
		Path target = resolveTarget();
		if (!applyEnabled || target == null || !Files.isRegularFile(updateDir().resolve("app.jar"))
				|| !Files.isRegularFile(updateDir().resolve("apply.flag"))) {
			return false;
		}
		Path parent = target.getParent();
		return parent != null && Files.isDirectory(parent) && (isWindows() || Files.isWritable(parent));
	}

	public Map<String, Object> apply() {
		if (!canApply()) {
			throw new IllegalStateException("当前部署没有开启应用内安装；请确认程序以发布包运行");
		}
		Path source = updateDir().resolve("app.jar");
		Path flag = updateDir().resolve("apply.flag");
		Path target = resolveTarget();
		try {
			String flagText = Files.readString(flag, StandardCharsets.UTF_8);
			String expected = null;
			for (String line : flagText.split("\\n")) {
				if (line.startsWith("sha256=")) {
					expected = line.substring("sha256=".length()).trim();
				}
			}
			String actual = sha256Of(source);
			if (expected != null && !expected.isBlank() && !expected.equalsIgnoreCase(actual)) {
				throw new IllegalStateException("待安装包的 sha256 校验失败");
			}
			if (isWindows()) {
				return applyWindows(source, flag, target);
			}
			return applyUnix(source, flag, target);
		}
		catch (Exception e) {
			throw new IllegalStateException("应用更新失败：" + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()), e);
		}
	}

	private Map<String, Object> applyUnix(Path source, Path flag, Path target) throws Exception {
		if (Files.isRegularFile(target)) {
			Files.copy(target, target.resolveSibling(target.getFileName() + ".bak-" + System.currentTimeMillis()),
					StandardCopyOption.REPLACE_EXISTING);
		}
		Path staged = target.resolveSibling(".app.jar.new");
		Files.copy(source, staged, StandardCopyOption.REPLACE_EXISTING);
		try {
			Files.move(staged, target, StandardCopyOption.REPLACE_EXISTING);
		}
		catch (Exception moveError) {
			Files.copy(staged, target, StandardCopyOption.REPLACE_EXISTING);
			Files.deleteIfExists(staged);
		}
		Files.deleteIfExists(flag);
		Files.deleteIfExists(source);
		scheduleExit();
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("phase", "restarting");
		result.put("message", "更新包已替换，服务正在重启");
		return result;
	}

	private Map<String, Object> applyWindows(Path source, Path flag, Path target) throws Exception {
		Path root = target.getParent() == null ? null : target.getParent().getParent();
		if (root == null || !Files.isRegularFile(root.resolve("start.cmd"))) {
			throw new IllegalStateException("找不到 Windows 启动脚本 start.cmd");
		}
		Path helper = updateDir().resolve("apply-update.cmd");
		Path log = updateDir().resolve("apply-update.log");
		String timestamp = String.valueOf(System.currentTimeMillis());
		String script = "@echo off\r\n"
				+ "chcp 65001 >nul\r\n"
				+ "timeout /t 3 /nobreak >nul\r\n"
				+ "if exist \"" + target + "\" copy /Y \"" + target + "\" \"" + target + ".bak-" + timestamp + "\" >>\"" + log + "\" 2>&1\r\n"
				+ "copy /Y \"" + source + "\" \"" + target + "\" >>\"" + log + "\" 2>&1\r\n"
				+ "if errorlevel 1 exit /b 1\r\n"
				+ "del /Q \"" + source + "\" >nul 2>&1\r\n"
				+ "del /Q \"" + flag + "\" >nul 2>&1\r\n"
				+ "start \"\" \"" + root.resolve("start.cmd") + "\" --no-browser\r\n";
		Files.writeString(helper, script, StandardCharsets.UTF_8);
		new ProcessBuilder("cmd.exe", "/c", "start", "", helper.toString()).start();
		scheduleExit();
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("phase", "restarting");
		result.put("message", "更新包已交给 Windows 更新器，服务正在重启");
		return result;
	}

	private void scheduleExit() {
		Thread restart = new Thread(() -> {
			try {
				Thread.sleep(1200);
			}
			catch (InterruptedException ignored) {
				Thread.currentThread().interrupt();
			}
			System.exit(0);
		}, "update-apply");
		restart.setDaemon(false);
		restart.start();
	}

	private Path resolveTarget() {
		if (applyJarPath != null && !applyJarPath.isBlank()) {
			return Paths.get(applyJarPath).toAbsolutePath().normalize();
		}
		String classPath = System.getProperty("java.class.path", "");
		for (String entry : classPath.split(File.pathSeparator)) {
			try {
				Path path = Paths.get(entry).toAbsolutePath().normalize();
				if (entry.endsWith(".jar") && Files.isRegularFile(path)) {
					return path;
				}
			}
			catch (Exception ignored) {
				// 非文件 classpath 条目跳过
			}
		}
		return null;
	}

	private boolean isWindows() {
		return System.getProperty("os.name", "").toLowerCase().contains("win");
	}

	public List<Map<String, Object>> history() {
		Path dir = downloadsDir();
		List<Map<String, Object>> items = new ArrayList<>();
		if (!Files.isDirectory(dir)) {
			return items;
		}
		try (var stream = Files.list(dir)) {
			stream.filter((path) -> path.getFileName().toString().endsWith(".jar")).forEach((path) -> {
				try {
					String file = path.getFileName().toString();
					Map<String, Object> item = new LinkedHashMap<>();
					item.put("version", file.substring(0, file.length() - 4));
					item.put("size", Files.size(path));
					item.put("downloadedAt", Files.getLastModifiedTime(path).toMillis());
					items.add(item);
				}
				catch (Exception e) {
					log.warn("读取下载记录失败 file={}", path, e);
				}
			});
		}
		catch (Exception e) {
			log.warn("读取下载记录失败", e);
		}
		items.sort(Comparator.comparingLong((Map<String, Object> item) -> ((Number) item.get("downloadedAt")).longValue())
				.reversed());
		return items;
	}

	public void delete(String version) {
		if (version == null || !version.matches("[0-9A-Za-z._-]+")) {
			throw new IllegalArgumentException("版本号不合法");
		}
		try {
			Files.deleteIfExists(downloadsDir().resolve(version + ".jar"));
			Path flag = updateDir().resolve("apply.flag");
			if (Files.isRegularFile(flag) && Files.readString(flag, StandardCharsets.UTF_8).contains("version=" + version)) {
				Files.deleteIfExists(updateDir().resolve("app.jar"));
				Files.deleteIfExists(flag);
			}
		}
		catch (Exception e) {
			throw new IllegalStateException("删除下载记录失败：" + e.getMessage(), e);
		}
	}

	public void clear() {
		try {
			Path downloads = downloadsDir();
			if (Files.isDirectory(downloads)) {
				try (var stream = Files.list(downloads)) {
					stream.forEach((path) -> {
						try {
							Files.deleteIfExists(path);
						}
						catch (Exception e) {
							log.warn("删除更新包失败 file={}", path, e);
						}
					});
				}
			}
			Files.deleteIfExists(updateDir().resolve("app.jar"));
			Files.deleteIfExists(updateDir().resolve("apply.flag"));
		}
		catch (Exception e) {
			throw new IllegalStateException("清理下载记录失败：" + e.getMessage(), e);
		}
	}

	private void run(String version, UpdateCheckView.Asset asset) {
		Path dir = updateDir();
		Path temp = dir.resolve("app.jar.part");
		Path history = downloadsDir().resolve(version + ".jar");
		List<String> candidates = UpdateMirrorResolver.assetUrls(asset.getUrl(), version, asset.getFile(),
				downloadMirrors, downloadProxy);
		if (candidates.isEmpty()) {
			synchronized (lock) {
				status.setPhase("failed");
				status.setError("没有可用的下载地址");
				status.setFinishedAt(System.currentTimeMillis());
			}
			return;
		}
		try {
			Files.createDirectories(downloadsDir());
			String lastError = "下载失败";
			for (int attempt = 1; attempt <= 3; attempt++) {
				beginAttempt(attempt);
				if (attempt > 1) {
					Thread.sleep(2000L * (attempt - 1));
				}
				for (String candidate : candidates) {
					synchronized (lock) {
						status.setPhase("downloading");
						status.setSource(UpdateMirrorResolver.label(candidate));
						status.setDownloadedBytes(0);
						status.setPercent(0);
						status.setBytesPerSecond(0);
						status.setError(null);
					}
					try {
						long started = System.currentTimeMillis();
						download(candidate, temp, started);
						synchronized (lock) {
							status.setPhase("verifying");
							status.setPercent(100);
						}
						String actual = verifyDownload(asset, temp);
						Files.move(temp, history, StandardCopyOption.REPLACE_EXISTING);
						Path app = dir.resolve("app.jar");
						Files.deleteIfExists(app);
						try {
							Files.createLink(app, history);
						}
						catch (Exception linkError) {
							Files.copy(history, app, StandardCopyOption.REPLACE_EXISTING);
						}
						Files.writeString(dir.resolve("apply.flag"),
								"version=" + version + "\nsha256=" + actual + "\n", StandardCharsets.UTF_8);
						synchronized (lock) {
							status.setPhase("done");
							status.setPercent(100);
							status.setVerified(asset.getSha256() != null && !asset.getSha256().isBlank());
							status.setFile(history.toString());
							status.setFinishedAt(System.currentTimeMillis());
						}
						log.info("更新包下载完成 version={} size={} sha256={} source={}", version,
								Files.size(history), actual, UpdateMirrorResolver.label(candidate));
						return;
					}
					catch (Exception e) {
						lastError = shortError(e);
						Files.deleteIfExists(temp);
						synchronized (lock) {
							status.setError(lastError);
							status.setPhase("retrying");
						}
						log.warn("更新包线路失败 version={} attempt={} source={} error={}", version, attempt,
								UpdateMirrorResolver.label(candidate), lastError);
					}
				}
			}
			synchronized (lock) {
				status.setPhase("failed");
				status.setError(lastError);
				status.setFinishedAt(System.currentTimeMillis());
			}
		}
		catch (Exception e) {
			synchronized (lock) {
				status.setPhase("failed");
				status.setError(shortError(e));
				status.setFinishedAt(System.currentTimeMillis());
			}
		}
	}

	private void beginAttempt(int attempt) {
		synchronized (lock) {
			status.setAttempt(attempt);
			status.setDownloadedBytes(0);
			status.setPercent(0);
			status.setBytesPerSecond(0);
			status.setError(null);
			status.setPhase(attempt == 1 ? "downloading" : "retrying");
		}
	}

	private String verifyDownload(UpdateCheckView.Asset asset, Path file) throws Exception {
		long size = Files.size(file);
		if (asset.getSize() != null && asset.getSize() > 0 && size != asset.getSize()) {
			throw new IllegalStateException("文件大小不符：" + size + "/" + asset.getSize());
		}
		if (!isJar(file)) {
			throw new IllegalStateException("下载内容不是 jar");
		}
		String actual = sha256Of(file);
		if (asset.getSha256() != null && !asset.getSha256().isBlank()
				&& !asset.getSha256().equalsIgnoreCase(actual)) {
			throw new IllegalStateException("sha256 校验失败");
		}
		return actual;
	}

	private boolean isJar(Path file) throws Exception {
		try (InputStream input = Files.newInputStream(file)) {
			return input.read() == 'P' && input.read() == 'K';
		}
	}

	private String shortError(Exception e) {
		String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
		return message.length() > 240 ? message.substring(0, 240) : message;
	}

	private void download(String url, Path target, long started) throws Exception {
		String current = url;
		for (int hop = 0; hop < 5; hop++) {
			HttpURLConnection connection = (HttpURLConnection) new URL(current).openConnection();
			connection.setConnectTimeout(10000);
			connection.setReadTimeout(60000);
			connection.setInstanceFollowRedirects(false);
			connection.setRequestProperty("User-Agent", "xuri-classroom/update");
			int code = connection.getResponseCode();
			if (code >= 300 && code < 400) {
				String location = connection.getHeaderField("Location");
				connection.disconnect();
				if (location == null || location.isBlank()) {
					throw new IllegalStateException("重定向没有 Location");
				}
				current = location;
				continue;
			}
			if (code != 200) {
				connection.disconnect();
				throw new IllegalStateException("下载返回 HTTP " + code);
			}
			long total = connection.getContentLengthLong();
			synchronized (lock) {
				status.setTotalBytes(total > 0 ? total : status.getTotalBytes());
			}
			try (InputStream input = connection.getInputStream();
					OutputStream output = Files.newOutputStream(target, StandardOpenOption.CREATE,
							StandardOpenOption.TRUNCATE_EXISTING)) {
				byte[] buffer = new byte[64 * 1024];
				int read;
				long downloaded = 0;
				while ((read = input.read(buffer)) > 0) {
					output.write(buffer, 0, read);
					downloaded += read;
					long elapsed = Math.max(1, System.currentTimeMillis() - started);
					synchronized (lock) {
						status.setDownloadedBytes(downloaded);
						status.setBytesPerSecond(downloaded * 1000 / elapsed);
						Long knownTotal = status.getTotalBytes();
						status.setPercent(knownTotal == null || knownTotal <= 0 ? -1
								: (int) Math.min(100, downloaded * 100 / knownTotal));
					}
				}
			}
			finally {
				connection.disconnect();
			}
			return;
		}
		throw new IllegalStateException("重定向次数过多");
	}

	private boolean running(UpdateDownloadStatus value) {
		return "downloading".equals(value.getPhase()) || "retrying".equals(value.getPhase())
				|| "verifying".equals(value.getPhase());
	}

	private UpdateDownloadStatus copy(UpdateDownloadStatus source) {
		UpdateDownloadStatus result = new UpdateDownloadStatus();
		result.setPhase(source.getPhase());
		result.setVersion(source.getVersion());
		result.setDownloadedBytes(source.getDownloadedBytes());
		result.setTotalBytes(source.getTotalBytes());
		result.setPercent(source.getPercent());
		result.setBytesPerSecond(source.getBytesPerSecond());
		result.setAttempt(source.getAttempt());
		result.setMaxAttempts(source.getMaxAttempts());
		result.setSource(source.getSource());
		result.setVerified(source.isVerified());
		result.setError(source.getError());
		result.setFile(source.getFile());
		result.setStartedAt(source.getStartedAt());
		result.setFinishedAt(source.getFinishedAt());
		return result;
	}

	private Path updateDir() {
		return Paths.get(fileRootPath, "update").toAbsolutePath().normalize();
	}

	private Path downloadsDir() {
		return updateDir().resolve("downloads");
	}

	private String sha256Of(Path file) throws Exception {
		MessageDigest digest = MessageDigest.getInstance("SHA-256");
		try (InputStream input = Files.newInputStream(file)) {
			byte[] buffer = new byte[64 * 1024];
			int read;
			while ((read = input.read(buffer)) > 0) {
				digest.update(buffer, 0, read);
			}
		}
		return HexFormat.of().formatHex(digest.digest());
	}
}
