package cn.surveyking.server.core.diag;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;








@Slf4j
@Component
public class DiagnosticsExporter {

	private static final long MAX_FILE_BYTES = 20L * 1024 * 1024;

	private static final long MAX_TOTAL_BYTES = 200L * 1024 * 1024;

	@Value("${sk.logs.dir:./logs}")
	private String logsDir;

	public byte[] export(int days) {
		LocalDate from = LocalDate.now().minusDays(Math.max(days, 1) - 1L);
		Path root = Paths.get(logsDir).toAbsolutePath().normalize();
		ByteArrayOutputStream buffer = new ByteArrayOutputStream();
		List<String> skipped = new ArrayList<>();
		int matched = 0;
		try (ZipOutputStream zip = new ZipOutputStream(buffer, StandardCharsets.UTF_8)) {
			if (Files.isDirectory(root)) {
				try (Stream<Path> walk = Files.walk(root, 3)) {
					List<Path> files = walk.filter(Files::isRegularFile).filter(DiagnosticsExporter::isLogFile)
							.sorted().toList();
					for (Path file : files) {
						if (!modifiedSince(file, from)) {
							continue;
						}
						long size = Files.size(file);
						if (size > MAX_FILE_BYTES || buffer.size() + size > MAX_TOTAL_BYTES) {
							skipped.add(root.relativize(file) + "（" + (size / 1024 / 1024) + "MB，超出上限）");
							continue;
						}
						String entry = "logs/" + root.relativize(file).toString().replace('\\', '/');
						zip.putNextEntry(new ZipEntry(entry));
						try (InputStream in = Files.newInputStream(file)) {
							in.transferTo(zip);
						}
						zip.closeEntry();
						matched++;
					}
				}
			}
			else {
				skipped.add("日志目录不存在：" + root);
			}
			zip.putNextEntry(new ZipEntry("diagnostics.txt"));
			zip.write(describe(root, days, matched, skipped).getBytes(StandardCharsets.UTF_8));
			zip.closeEntry();
		}
		catch (IOException ex) {
			log.warn("导出诊断日志失败 logsDir={}", root, ex);
			throw new IllegalStateException("导出诊断日志失败：" + ex.getMessage(), ex);
		}
		return buffer.toByteArray();
	}

	private String describe(Path root, int days, int matched, List<String> skipped) {
		StringBuilder text = new StringBuilder();
		text.append("旭日云课堂 诊断日志包\n");
		text.append("生成时间：")
				.append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))).append('\n');
		text.append("保留范围：最近 ").append(days).append(" 天\n");
		text.append("日志目录：").append(root).append(Files.isDirectory(root) ? "（存在）" : "（不存在）").append('\n');
		text.append("打包文件数：").append(matched).append('\n');
		text.append("Java：").append(System.getProperty("java.version")).append(" / ")
				.append(System.getProperty("java.vendor")).append('\n');
		text.append("操作系统：").append(System.getProperty("os.name")).append(' ').append(System.getProperty("os.arch"))
				.append('\n');
		text.append("时区：").append(ZoneId.systemDefault()).append(" / ").append(Locale.getDefault()).append('\n');
		text.append("运行目录：").append(Paths.get(".").toAbsolutePath().normalize()).append('\n');
		if (!skipped.isEmpty()) {
			text.append("\n未打包：\n");
			for (String item : skipped) {
				text.append("  - ").append(item).append('\n');
			}
		}
		if (matched == 0) {
			text.append("\n没有找到可打包的日志文件。Docker 部署时可在宿主机执行：\n");
			text.append("  docker logs --since 24h xuri-live-app > app.log\n");
			text.append("再把 app.log 一起发给管理员。\n");
		}
		text.append("\n请把整个 zip 发给管理员；文件里只有运行日志与环境信息，不含答卷内容和密码。\n");
		return text.toString();
	}

	private static boolean isLogFile(Path file) {
		String name = file.getFileName().toString().toLowerCase(Locale.ROOT);
		return name.endsWith(".log") || name.endsWith(".log.zip") || name.endsWith(".gz") || name.endsWith(".txt");
	}

	private static boolean modifiedSince(Path file, LocalDate from) {
		try {
			LocalDate modified = Files.getLastModifiedTime(file).toInstant().atZone(ZoneId.systemDefault())
					.toLocalDate();
			return !modified.isBefore(from);
		}
		catch (IOException ex) {
			return false;
		}
	}

}