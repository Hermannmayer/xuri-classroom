package cn.surveyking.server.api;

import cn.surveyking.server.core.export.PaperDocxExporter;
import cn.surveyking.server.domain.dto.FileQuery;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.service.FileService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;


@RequiredArgsConstructor
@RestController
public class PaperExportApi {

	private final ProjectService projectService;

	private final FileService fileService;

	@GetMapping("${api.prefix}/paper/{id}/docx")
	@PreAuthorize("hasAuthority('project:detail') or hasRole('admin')")
	public void docx(@PathVariable("id") String id, @RequestParam(value = "answers", defaultValue = "false") boolean answers,
			@RequestParam(value = "card", defaultValue = "false") boolean card, HttpServletResponse response)
			throws IOException {
		ProjectView project = projectService.getProject(id);
		byte[] bytes = PaperDocxExporter.export(project, answers, card, this::loadImage);
		response.setContentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
		response.setHeader("Content-Disposition", ContentDisposition.builder("attachment")
				.filename((project.getName() == null ? "试卷" : project.getName()) + ".docx", StandardCharsets.UTF_8)
				.build().toString());
		response.setContentLength(bytes.length);
		response.getOutputStream().write(bytes);
		response.flushBuffer();
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

}
