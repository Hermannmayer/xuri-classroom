package cn.surveyking.server.api;

import cn.surveyking.server.core.export.PaperDocxExporter;
import cn.surveyking.server.domain.dto.FileQuery;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.service.ExportGuardService;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.json.JsonMapper;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 试卷/问卷本体导出：完整 JSON 备份与 Word 文档，共用系统导出密码守卫 */
@RequiredArgsConstructor
@RestController
public class ProjectExportApi {

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private static final Pattern PREVIEW = Pattern.compile("/api/public/preview/([A-Za-z0-9_-]{1,64})");

	private static final long MAX_ASSET_BYTES = 4L * 1024 * 1024;

	private static final long MAX_ASSETS_BASE64_LENGTH = 8L * 1024 * 1024;

	private final ProjectService projectService;

	private final ExportGuardService exportGuardService;

	private final FileService fileService;

	@PostMapping("${api.prefix}/project/export/token")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public Map<String, Object> exportToken(@RequestBody(required = false) Map<String, Object> body) {
		Object password = body == null ? null : body.get("exportPassword");
		return exportGuardService.issueToken(password == null ? null : String.valueOf(password));
	}

	@GetMapping("${api.prefix}/project/{id}/export/json")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public void exportJson(@PathVariable("id") String id,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword,
			HttpServletResponse response) throws IOException {
		assertExportAllowed(exportToken, exportPassword);
		ProjectView project = projectService.getProject(id);
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("version", 1);
		body.put("name", project.getName());
		body.put("mode", project.getMode());
		body.put("setting", project.getSetting());
		body.put("survey", project.getSurvey());
		body.put("assets", collectAssets(project));
		byte[] bytes = JSON.writeValueAsBytes(body);
		String fileName = (project.getName() == null ? "试卷" : project.getName()) + "-备份.json";
		write(response, bytes, "application/json;charset=UTF-8", fileName);
		Map<String, Object> scope = new LinkedHashMap<>();
		scope.put("projectId", id);
		scope.put("name", project.getName());
		scope.put("mode", project.getMode());
		scope.put("format", "json");
		exportGuardService.record(ExportGuardService.EXPORT_PROJECT, id, project.getName(), "导出试卷/问卷 JSON 备份", scope);
	}

	@GetMapping("${api.prefix}/project/{id}/export/docx")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public void exportDocx(@PathVariable("id") String id,
			@RequestParam(value = "exportToken", required = false) String exportToken,
			@RequestParam(value = "exportPassword", required = false) String exportPassword,
			HttpServletResponse response) throws IOException {
		assertExportAllowed(exportToken, exportPassword);
		ProjectView project = projectService.getProject(id);
		byte[] bytes = PaperDocxExporter.export(project, false, false, this::loadImage);
		String fileName = (project.getName() == null ? "试卷" : project.getName()) + ".docx";
		write(response, bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName);
		Map<String, Object> scope = new LinkedHashMap<>();
		scope.put("projectId", id);
		scope.put("name", project.getName());
		scope.put("mode", project.getMode());
		scope.put("format", "docx");
		exportGuardService.record(ExportGuardService.EXPORT_PROJECT, id, project.getName(), "导出试卷/问卷 Word 文档", scope);
	}

	private Map<String, String> collectAssets(ProjectView project) {
		Map<String, String> assets = new LinkedHashMap<>();
		String json;
		try {
			json = JSON.writeValueAsString(project.getSetting()) + JSON.writeValueAsString(project.getSurvey());
		}
		catch (Exception ex) {
			return assets;
		}
		Matcher matcher = PREVIEW.matcher(json);
		long encodedSize = 0;
		while (matcher.find()) {
			String url = matcher.group();
			if (assets.containsKey(url)) {
				continue;
			}
			byte[] data = loadImage(matcher.group(1));
			if (data == null || data.length == 0 || data.length > MAX_ASSET_BYTES) {
				continue;
			}
			String base64 = Base64.getEncoder().encodeToString(data);
			if (encodedSize + base64.length() > MAX_ASSETS_BASE64_LENGTH) {
				continue;
			}
			assets.put(url, base64);
			encodedSize += base64.length();
		}
		return assets;
	}

	private byte[] loadImage(String fileId) {
		try {
			FileQuery query = new FileQuery(fileId);
			ResponseEntity<Resource> response;
			try {
				response = fileService.loadPublicFile(query);
			}
			catch (Exception ex) {
				response = fileService.loadFile(query);
			}
			Resource resource = response == null ? null : response.getBody();
			if (resource == null) {
				return null;
			}
			try (InputStream input = resource.getInputStream()) {
				return input.readAllBytes();
			}
		}
		catch (Exception ex) {
			return null;
		}
	}

	private void assertExportAllowed(String exportToken, String exportPassword) {
		if (exportToken != null && !exportToken.isEmpty()) {
			exportGuardService.assertTokenAllowed(exportToken);
			return;
		}
		exportGuardService.assertExportAllowed(exportPassword);
	}

	private void write(HttpServletResponse response, byte[] bytes, String contentType, String fileName)
			throws IOException {
		response.setContentType(contentType);
		response.setHeader("Content-Disposition", ContentDisposition.builder("attachment")
				.filename(fileName, StandardCharsets.UTF_8).build().toString());
		response.setContentLength(bytes.length);
		response.getOutputStream().write(bytes);
		response.flushBuffer();
	}

}
