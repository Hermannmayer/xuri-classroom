package cn.surveyking.server.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import javax.sql.DataSource;
import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/** 整站备份：把数据库表与本地附件目录打包成一个可下载 ZIP */
@Slf4j
@Component
@RequiredArgsConstructor
public class FullSiteBackupService {

	private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss XXX");

	private static final char TICK = 96;

	private final DataSource dataSource;

	@Value("${file-storage.local.root-path:./files}")
	private String fileRootPath;

	public Path createBackup() throws IOException {
		Path zipFile = Files.createTempFile("xuri-classroom-backup-", ".zip");
		try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(zipFile))) {
			int tables = writeDatabase(zip);
			int files = writeFiles(zip);
			writeManifest(zip, tables, files);
		}
		catch (Exception e) {
			Files.deleteIfExists(zipFile);
			if (e instanceof IOException io) {
				throw io;
			}
			throw new IOException("生成整站备份失败：" + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()), e);
		}
		return zipFile;
	}

	private int writeDatabase(ZipOutputStream zip) throws Exception {
		zip.putNextEntry(new ZipEntry("database.sql"));
		BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(zip, StandardCharsets.UTF_8));
		int count = 0;
		try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
			writer.write("SET NAMES utf8mb4;\n");
			writer.write("SET FOREIGN_KEY_CHECKS=0;\n\n");
			List<String> tables = new ArrayList<>();
			try (ResultSet result = statement.executeQuery("SHOW TABLES")) {
				while (result.next()) {
					tables.add(result.getString(1));
				}
			}
			for (String table : tables) {
				String quoted = quoteIdentifier(table);
				writer.write("DROP TABLE IF EXISTS " + quoted + ";\n");
				try (ResultSet result = statement.executeQuery("SHOW CREATE TABLE " + quoted)) {
					if (result.next()) {
						writer.write(result.getString(2));
						writer.write(";\n\n");
					}
				}
				List<String> columns = readableColumns(statement, quoted);
				if (!columns.isEmpty()) {
					String select = "SELECT " + columns.stream().map(FullSiteBackupService::quoteIdentifier)
							.collect(java.util.stream.Collectors.joining(",")) + " FROM " + quoted;
					try (ResultSet result = statement.executeQuery(select)) {
						while (result.next()) {
							writer.write("INSERT INTO " + quoted + " ("
									+ columns.stream().map(FullSiteBackupService::quoteIdentifier)
											.collect(java.util.stream.Collectors.joining(","))
									+ ") VALUES (");
							for (int i = 1; i <= columns.size(); i++) {
								if (i > 1) writer.write(",");
								writer.write(sqlValue(result.getObject(i)));
							}
							writer.write(");\n");
						}
					}
				}
				writer.write("\n");
				count++;
			}
			writer.write("SET FOREIGN_KEY_CHECKS=1;\n");
		}
		finally {
			writer.flush();
			zip.closeEntry();
		}
		log.info("整站备份：数据库表 {} 张", count);
		return count;
	}

	private static List<String> readableColumns(Statement statement, String quoted) throws Exception {
		List<String> columns = new ArrayList<>();
		try (ResultSet result = statement.executeQuery("SHOW COLUMNS FROM " + quoted)) {
			while (result.next()) {
				String extra = result.getString("Extra");
				if (extra != null && extra.toUpperCase().contains("GENERATED")) {
					continue;
				}
				columns.add(result.getString("Field"));
			}
		}
		return columns;
	}

	private int writeFiles(ZipOutputStream zip) throws IOException {
		zip.putNextEntry(new ZipEntry("files/"));
		zip.closeEntry();
		Path root = Paths.get(fileRootPath).toAbsolutePath().normalize();
		if (!Files.isDirectory(root)) {
			log.info("整站备份：附件目录不存在，跳过 {}", root);
			return 0;
		}
		int count = 0;
		try (var paths = Files.walk(root)) {
			for (Path path : paths.filter(Files::isRegularFile).sorted().toList()) {
				String name = root.relativize(path).toString().replace('\\', '/');
				zip.putNextEntry(new ZipEntry("files/" + name));
				Files.copy(path, zip);
				zip.closeEntry();
				count++;
			}
		}
		log.info("整站备份：附件 {} 个", count);
		return count;
	}

	private void writeManifest(ZipOutputStream zip, int tables, int files) throws IOException {
		zip.putNextEntry(new ZipEntry("manifest.json"));
		String manifest = "{\n  \"format\": \"xuri-full-backup\",\n  \"version\": 1,\n"
				+ "  \"generatedAt\": \"" + OffsetDateTime.now().format(TIME) + "\",\n"
				+ "  \"tables\": " + tables + ",\n  \"files\": " + files + "\n}\n";
		zip.write(manifest.getBytes(StandardCharsets.UTF_8));
		zip.closeEntry();
	}

	private static String quoteIdentifier(String value) {
		String tick = String.valueOf(TICK);
		return tick + value.replace(tick, tick + tick) + tick;
	}


	private static final long MAX_RESTORE_SIZE = 2L * 1024 * 1024 * 1024;

	private final AtomicBoolean restoring = new AtomicBoolean(false);

	public Map<String, Object> restoreBackup(MultipartFile upload) throws IOException {
		if (upload == null || upload.isEmpty()) {
			throw new IOException("请上传整站备份 ZIP");
		}
		if (upload.getSize() > MAX_RESTORE_SIZE) {
			throw new IOException("备份文件超过 2GB 限制");
		}
		if (!restoring.compareAndSet(false, true)) {
			throw new IOException("已有恢复任务在进行，请稍后再试");
		}
		Path work = null;
		try {
			work = Files.createTempDirectory("xuri-restore-");
			ExtractResult extracted = extract(upload, work);
			JsonNode manifest = JsonMapper.builder().build().readTree(extracted.manifest());
			if (!"xuri-full-backup".equals(manifest.path("format").asText())
					|| manifest.path("version").asInt(0) != 1) {
				throw new IOException("不是受支持的整站备份格式");
			}
			executeSql(extracted.database());
			int files = restoreFiles(work.resolve("files"));
			Map<String, Object> result = new LinkedHashMap<>();
			result.put("tables", manifest.path("tables").asInt(0));
			result.put("files", files);
			result.put("restartRequired", true);
			log.info("整站恢复完成：表 {} 张，附件 {} 个", result.get("tables"), files);
			return result;
		}
		finally {
			if (work != null) {
				deleteRecursively(work);
			}
			restoring.set(false);
		}
	}

	private ExtractResult extract(MultipartFile upload, Path work) throws IOException {
		Path database = work.resolve("database.sql");
		Path files = work.resolve("files");
		String manifest = null;
		long total = 0;
		Files.createDirectories(files);
		try (ZipInputStream zip = new ZipInputStream(new BufferedInputStream(upload.getInputStream()))) {
			ZipEntry entry;
			while ((entry = zip.getNextEntry()) != null) {
				String name = entry.getName().replace('\\', '/');
				if (name.isEmpty()) {
					continue;
				}
				if (name.startsWith("/") || name.contains("../") || name.equals("..")) {
					throw new IOException("备份包含非法路径：" + name);
				}
				if (name.equals("manifest.json")) {
					manifest = readLimited(zip, 1024 * 1024);
					total += manifest.getBytes(StandardCharsets.UTF_8).length;
					continue;
				}
				if (name.equals("database.sql")) {
					total += copyLimited(zip, database, MAX_RESTORE_SIZE - total);
					continue;
				}
				if (name.startsWith("files/")) {
					String relative = name.substring("files/".length());
					if (relative.isEmpty() || name.endsWith("/")) {
						Files.createDirectories(files);
						continue;
					}
					Path target = files.resolve(relative).normalize();
					if (!target.startsWith(files.normalize())) {
						throw new IOException("备份包含非法附件路径：" + name);
					}
					Files.createDirectories(target.getParent());
					total += copyLimited(zip, target, MAX_RESTORE_SIZE - total);
					continue;
				}
				throw new IOException("备份包含未知文件：" + name);
			}
		}
		if (manifest == null || !Files.isRegularFile(database)) {
			throw new IOException("备份缺少 manifest.json 或 database.sql");
		}
		return new ExtractResult(manifest, database);
	}

	private static String readLimited(InputStream input, long max) throws IOException {
		java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
		copyLimited(input, out, max);
		return out.toString(StandardCharsets.UTF_8);
	}

	private static long copyLimited(InputStream input, Path target, long max) throws IOException {
		try (OutputStream out = Files.newOutputStream(target)) {
			return copyLimited(input, out, max);
		}
	}

	private static long copyLimited(InputStream input, OutputStream output, long max) throws IOException {
		byte[] buffer = new byte[8192];
		long total = 0;
		int read;
		while ((read = input.read(buffer)) != -1) {
			total += read;
			if (total > max) {
				throw new IOException("备份解压后超过 2GB 限制");
			}
			output.write(buffer, 0, read);
		}
		return total;
	}

	private void executeSql(Path database) throws IOException {
		try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
			connection.setAutoCommit(false);
			try (BufferedReader reader = Files.newBufferedReader(database, StandardCharsets.UTF_8)) {
				StringBuilder sql = new StringBuilder();
				boolean single = false;
				boolean doubleQuote = false;
				boolean backtick = false;
				boolean lineComment = false;
				boolean blockComment = false;
				boolean escaped = false;
				int ch;
				while ((ch = reader.read()) != -1) {
					char current = (char) ch;
					if (lineComment) {
						if (current == '\n') {
							lineComment = false;
							sql.append('\n');
						}
						continue;
					}
					if (blockComment) {
						if (current == '*' && reader.markSupported()) {
							reader.mark(1);
							if (reader.read() != '/') {
								reader.reset();
							}
							else {
								blockComment = false;
							}
						}
						continue;
					}
					if (single || doubleQuote || backtick) {
						sql.append(current);
						if (escaped) {
							escaped = false;
						}
						else if (current == '\\' && !backtick) {
							escaped = true;
						}
						else if (single && current == '\'') {
							single = false;
						}
						else if (doubleQuote && current == '"') {
							doubleQuote = false;
						}
						else if (backtick && current == 96) {
							backtick = false;
						}
						continue;
					}
					if (current == '-' && reader.markSupported()) {
						reader.mark(1);
						if (reader.read() == '-') {
							lineComment = true;
							continue;
						}
						reader.reset();
					}
					if (current == '#') {
						lineComment = true;
						continue;
					}
					if (current == '/' && reader.markSupported()) {
						reader.mark(1);
						if (reader.read() == '*') {
							blockComment = true;
							continue;
						}
						reader.reset();
					}
					if (current == '\'') {
						single = true;
						sql.append(current);
						continue;
					}
					if (current == '"') {
						doubleQuote = true;
						sql.append(current);
						continue;
					}
					if (current == 96) {
						backtick = true;
						sql.append(current);
						continue;
					}
					if (current == ';') {
						executeStatement(statement, sql.toString());
						sql.setLength(0);
						continue;
					}
					sql.append(current);
				}
				executeStatement(statement, sql.toString());
				connection.commit();
			}
			catch (Exception e) {
				connection.rollback();
				throw e;
			}
		}
		catch (IOException e) {
			throw e;
		}
		catch (Exception e) {
			throw new IOException("导入 database.sql 失败：" + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()), e);
		}
	}

	private static void executeStatement(Statement statement, String sql) throws Exception {
		String trimmed = sql.trim();
		if (trimmed.isEmpty()) {
			return;
		}
		String upper = trimmed.toUpperCase(java.util.Locale.ROOT);
		if (upper.startsWith("DROP DATABASE") || upper.startsWith("CREATE DATABASE")
				|| upper.startsWith("USE ") || upper.startsWith("GRANT ") || upper.startsWith("REVOKE ")
				|| upper.startsWith("CREATE USER") || upper.startsWith("DROP USER")
				|| upper.startsWith("SET GLOBAL") || upper.startsWith("LOAD DATA")
				|| upper.startsWith("INTO OUTFILE") || upper.startsWith("SHUTDOWN")) {
			throw new IOException("备份包含不允许的 SQL：" + upper.substring(0, Math.min(upper.length(), 40)));
		}
		statement.execute(trimmed);
	}

	private int restoreFiles(Path incoming) throws IOException {
		Path root = Paths.get(fileRootPath).toAbsolutePath().normalize();
		Path old = null;
		try {
			if (Files.exists(root)) {
				old = Files.createTempDirectory("xuri-old-files-");
				Files.move(root, old, StandardCopyOption.REPLACE_EXISTING);
			}
			Files.createDirectories(root.getParent());
			Files.move(incoming, root, StandardCopyOption.REPLACE_EXISTING);
		}
		catch (IOException e) {
			if (old != null && Files.exists(old) && !Files.exists(root)) {
				Files.move(old, root, StandardCopyOption.REPLACE_EXISTING);
			}
			throw new IOException("恢复附件目录失败：" + e.getMessage(), e);
		}
		finally {
			if (old != null) {
				deleteRecursively(old);
			}
		}
		try (var paths = Files.walk(root)) {
			return (int) paths.filter(Files::isRegularFile).count();
		}
	}

	private static void deleteRecursively(Path path) {
		if (path == null || !Files.exists(path)) {
			return;
		}
		try (var paths = Files.walk(path)) {
			paths.sorted(java.util.Comparator.reverseOrder()).forEach((item) -> {
				try {
					Files.deleteIfExists(item);
				}
				catch (IOException ignored) {
				}
			});
		}
		catch (IOException ignored) {
		}
	}

	private record ExtractResult(String manifest, Path database) {
	}

	private static String sqlValue(Object value) {
		if (value == null) {
			return "NULL";
		}
		if (value instanceof byte[] bytes) {
			StringBuilder hex = new StringBuilder("X'");
			for (byte b : bytes) {
				hex.append(String.format("%02X", b));
			}
			return hex.append("'").toString();
		}
		if (value instanceof Number || value instanceof Boolean) {
			return String.valueOf(value);
		}
		String text = String.valueOf(value)
				.replace("\\", "\\\\")
				.replace("'", "\\'")
				.replace("\r", "\\r")
				.replace("\n", "\\n")
				.replace("\0", "\\0");
		return "'" + text + "'";
	}
}
